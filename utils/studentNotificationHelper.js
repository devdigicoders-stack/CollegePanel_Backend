const Student = require('../models/Student');
const Admission = require('../models/Admission');
const Teacher = require('../models/Teacher');
const Employee = require('../models/Employee');
const LiveNotification = require('../models/LiveNotification');
const { sendMulticastPush, sendTopicPush } = require('../config/firebase');

/**
 * Notify enrolled students about a new assignment or study material
 * Works identically whether created by Teacher or Admin!
 * Sends:
 *  1. Database LiveNotification record for student bell history & unread badge
 *  2. Real-time Socket.IO event with audio chime trigger
 *  3. Firebase Cloud Messaging (FCM) Push (Multicast & Topic) for closed/background screens
 */
const notifyStudentsOfClass = async ({
  collegeId,
  courseName,
  department,
  course,
  branch,
  semester,
  section,
  title,
  message,
  type = 'Assignment',
  link = '/student/assignments',
  extraData = {},
  io,
  connectedUsers
}) => {
  try {
    const targetBranch = (courseName || branch || '').trim();
    const targetDept = (department || course || '').trim();

    // Branch / Course matching: check both branch and course fields
    const branchOr = [];
    if (targetBranch) {
      branchOr.push({ branch: new RegExp(`^${targetBranch}$`, 'i') });
      branchOr.push({ course: new RegExp(`^${targetBranch}$`, 'i') });
      branchOr.push({ branch: new RegExp(targetBranch, 'i') });
    }
    if (targetDept && targetDept.toLowerCase() !== targetBranch.toLowerCase()) {
      branchOr.push({ branch: new RegExp(`^${targetDept}$`, 'i') });
      branchOr.push({ course: new RegExp(`^${targetDept}$`, 'i') });
    }

    const studentQuery = { collegeId, status: 'Active' };
    const admissionQuery = { collegeId, status: { $in: ['Approved', 'Confirmed', 'Admitted', 'Active'] } };

    if (branchOr.length > 0) {
      studentQuery.$or = branchOr;
      admissionQuery.$or = branchOr;
    }

    // Semester and year matching (if semester is specified and not 'All')
    const hasSemesterFilter = semester && semester !== 'All' && semester !== 'All Semesters';
    if (hasSemesterFilter) {
      const semNum = parseInt(String(semester).replace(/[^0-9]/g, ''), 10) || 1;
      const yearMap = { 
        1: ['1st', '1st Year'], 
        2: ['1st', '1st Year'], 
        3: ['2nd', '2nd Year'], 
        4: ['2nd', '2nd Year'], 
        5: ['3rd', '3rd Year'], 
        6: ['3rd', '3rd Year'], 
        7: ['4th', '4th Year'], 
        8: ['4th', '4th Year'] 
      };
      const yearList = yearMap[semNum] || ['1st', '1st Year'];

      const semConditions = [
        { semester: new RegExp(`(^|\\b)Sem(ester)?\\s*0*${semNum}(\\b|$)`, 'i') },
        { semester: semNum },
        { semester: String(semNum) },
        { semester: `${semNum}st` },
        { semester: `${semNum}nd` },
        { semester: `${semNum}rd` },
        { semester: `${semNum}th` },
        { year: { $in: yearList } }
      ];

      studentQuery.$and = [{ $or: semConditions }];
      admissionQuery.$and = [{ $or: semConditions }];
    }

    if (section && section !== 'All' && section !== 'General') {
      const sectionCondition = {
        $or: [
          { section: new RegExp(`^${section.trim()}$`, 'i') },
          { section: { $exists: false } },
          { section: '' },
          { section: null }
        ]
      };
      if (!studentQuery.$and) studentQuery.$and = [];
      studentQuery.$and.push(sectionCondition);

      if (!admissionQuery.$and) admissionQuery.$and = [];
      admissionQuery.$and.push(sectionCondition);
    }

    // Query both Student and Admission collections to ensure enrolled applicants get notified too
    const [students, admissions] = await Promise.all([
      Student.find(studentQuery).select('_id studentName fcmTokens branch course semester section email phone').lean(),
      Admission.find(admissionQuery).select('_id name fcmTokens branch course semester section email phone').lean()
    ]);

    // Consolidate target recipients (by unique id and deduplicate by token)
    const allRecipients = [];
    const seenIds = new Set();
    const allTokens = [];

    (students || []).forEach(s => {
      const idStr = s._id.toString();
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        allRecipients.push({ id: idStr, name: s.studentName });
      }
      if (Array.isArray(s.fcmTokens)) {
        s.fcmTokens.forEach(t => { if (t && !allTokens.includes(t)) allTokens.push(t); });
      }
    });

    (admissions || []).forEach(a => {
      const idStr = a._id.toString();
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        allRecipients.push({ id: idStr, name: a.name });
      }
      if (Array.isArray(a.fcmTokens)) {
        a.fcmTokens.forEach(t => { if (t && !allTokens.includes(t)) allTokens.push(t); });
      }
    });

    if (allRecipients.length === 0) {
      console.log(`ℹ️ No students matched for notification: ${targetBranch} Sem ${semester}`);
      return { count: 0 };
    }

    console.log(`📢 Sending notifications to ${allRecipients.length} matching students for ${type}: "${title}"`);

    // 1. Insert In-App Live Notifications into Database for Bell Menu & Badge
    const notificationsToInsert = allRecipients.map(r => ({
      userId: r.id,
      role: 'Student',
      title,
      message,
      type,
      link,
      isRead: false,
      collegeId
    }));

    await LiveNotification.insertMany(notificationsToInsert);

    // 2. Emit Real-time Socket.IO Events for Open Panels
    if (io) {
      const socketPayload = {
        title,
        message,
        type,
        link,
        collegeId: collegeId.toString(),
        createdAt: new Date(),
        ...extraData
      };

      allRecipients.forEach(r => {
        io.to(`user_${r.id}`).emit('new_student_notification', {
          ...socketPayload,
          studentId: r.id
        });
        io.to(`student_${r.id}`).emit('new_student_notification', {
          ...socketPayload,
          studentId: r.id
        });
        io.to(`user_${r.id}`).emit('new_notification', {
          ...socketPayload,
          studentId: r.id
        });

        if (connectedUsers) {
          const socketId = connectedUsers.get(r.id);
          if (socketId) {
            io.to(socketId).emit('new_student_notification', {
              ...socketPayload,
              studentId: r.id
            });
            io.to(socketId).emit('new_notification', {
              ...socketPayload,
              studentId: r.id
            });
          }
        }
      });

      // Dual-channel targeted broadcast to college room: guarantees real-time reception even if unicast room was delayed
      io.to(`college_${collegeId}`).emit('new_student_notification_broadcast', {
        ...socketPayload,
        recipientIds: allRecipients.map(r => r.id.toString())
      });

      // Broadcast update event so counters & badges update immediately
      io.to(`college_${collegeId}`).emit('student_content_updated', {
        type,
        collegeId: collegeId.toString()
      });
      if (type === 'Assignment') {
        io.to(`college_${collegeId}`).emit('assignments_updated', { collegeId: collegeId.toString() });
      } else if (type === 'StudyMaterial') {
        io.to(`college_${collegeId}`).emit('materials_updated', { collegeId: collegeId.toString() });
      }
    }

    // 3. Send Push Notification via Firebase Cloud Messaging (FCM)
    try {
      const pushPayload = {
        title,
        body: message,
        data: {
          link,
          type,
          collegeId: collegeId.toString(),
          ...Object.fromEntries(Object.entries(extraData).map(([k, v]) => [k, String(v)]))
        }
      };

      if (allTokens.length > 0) {
        console.log(`📱 Sending FCM multicast push to ${allTokens.length} student devices...`);
        await sendMulticastPush(allTokens, pushPayload);
      }

      if (targetBranch) {
        const cleanBranch = targetBranch.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await sendTopicPush(`college_${collegeId}_branch_${cleanBranch}`, pushPayload).catch(() => {});
      }
      await sendTopicPush(`college_${collegeId}_students`, pushPayload).catch(() => {});
    } catch (fcmErr) {
      console.warn('⚠️ FCM student push error:', fcmErr.message);
    }

    return { count: allRecipients.length };
  } catch (err) {
    console.error('❌ Error in notifyStudentsOfClass:', err);
    return { error: err.message };
  }
};

/**
 * Notify students, teachers, and staff about a College Notice / Announcement
 * Works when Admin or Teacher publishes a notice!
 */
const notifyAudienceOfNotice = async ({
  collegeId,
  title,
  message,
  targetAudience = 'All Students',
  department = '',
  courseName = '',
  semester = '',
  noticeId = '',
  postedBy = 'College Admin',
  postedByRole = '',
  io,
  connectedUsers
}) => {
  try {
    const audience = targetAudience || 'All Students';
    const isStudentsTargeted =
      audience === 'All Students' ||
      audience === 'All' ||
      audience.toLowerCase().includes('student') ||
      audience === 'Specific Course' ||
      audience === 'Specific Department' ||
      audience === 'Hostel Residents' ||
      audience === 'All Parents';

    const isStaffTargeted =
      audience === 'All Staff' ||
      audience === 'All' ||
      audience.toLowerCase().includes('staff') ||
      audience === 'Specific Department';

    const targetRecipients = [];
    const seenIds = new Set();
    const allTokens = [];

    // 1. Fetch target students if applicable
    if (isStudentsTargeted) {
      const studentQuery = { collegeId, status: 'Active' };
      const admissionQuery = { collegeId, status: { $in: ['Approved', 'Confirmed', 'Admitted', 'Active'] } };

      if (audience === 'Hostel Residents') {
        studentQuery.$or = [
          { hostelRequired: new RegExp('^yes', 'i') },
          { hostelRequired: 'Yes' }
        ];
        const count = await Student.countDocuments(studentQuery);
        if (count === 0) {
          delete studentQuery.$or; // fallback so alert is not dropped
        }
      } else {
        const filterTerm = (courseName || department || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (filterTerm && (audience === 'Specific Department' || audience === 'Specific Course')) {
          const deptOr = [
            { branch: new RegExp(filterTerm, 'i') },
            { course: new RegExp(filterTerm, 'i') },
            { department: new RegExp(filterTerm, 'i') }
          ];
          studentQuery.$or = deptOr;
          admissionQuery.$or = deptOr;
        }

        if (semester) {
          studentQuery.semester = semester;
        }
      }

      const [students, admissions] = await Promise.all([
        Student.find(studentQuery).select('_id studentName fcmTokens').lean(),
        Admission.find(admissionQuery).select('_id name fcmTokens').lean()
      ]);

      (students || []).forEach(s => {
        const idStr = s._id.toString();
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          targetRecipients.push({ id: idStr, role: 'Student', link: '/student/notices' });
        }
        if (Array.isArray(s.fcmTokens)) {
          s.fcmTokens.forEach(t => { if (t && !allTokens.includes(t)) allTokens.push(t); });
        }
      });

      (admissions || []).forEach(a => {
        const idStr = a._id.toString();
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          targetRecipients.push({ id: idStr, role: 'Student', link: '/student/notices' });
        }
        if (Array.isArray(a.fcmTokens)) {
          a.fcmTokens.forEach(t => { if (t && !allTokens.includes(t)) allTokens.push(t); });
        }
      });
    }

    // 2. Fetch target teachers / staff if applicable
    if (isStaffTargeted) {
      const staffQuery = { collegeId };
      const filterDept = (department || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (filterDept && audience === 'Specific Department') {
        staffQuery.department = new RegExp(filterDept, 'i');
      }

      const [teachers, employees] = await Promise.all([
        Teacher.find(staffQuery).select('_id name fcmTokens').lean(),
        Employee.find(staffQuery).select('_id name fcmTokens').lean()
      ]);

      (teachers || []).forEach(t => {
        const idStr = t._id.toString();
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          targetRecipients.push({ id: idStr, role: 'Teacher', link: '/teacher-portal/notices' });
        }
        if (Array.isArray(t.fcmTokens)) {
          t.fcmTokens.forEach(tok => { if (tok && !allTokens.includes(tok)) allTokens.push(tok); });
        }
      });

      (employees || []).forEach(e => {
        const idStr = e._id.toString();
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          const roleLower = (e.role || '').toLowerCase();
          const empLink = roleLower.includes('warden') ? '/hostel-warden/notices' : '/notice';
          targetRecipients.push({ id: idStr, role: e.role || 'Employee', link: empLink });
        }
        if (Array.isArray(e.fcmTokens)) {
          e.fcmTokens.forEach(tok => { if (tok && !allTokens.includes(tok)) allTokens.push(tok); });
        }
      });
    }

    // 3. If notice was posted by a Teacher, Warden, or Staff, ensure College Admin also gets alerted
    const pRole = (postedByRole || '').toLowerCase();
    const isAdminPoster = pRole === 'college admin' || pRole === 'college_admin' || pRole === 'admin' || pRole === 'principal';
    if (!isAdminPoster) {
      if (!seenIds.has('admin')) {
        seenIds.add('admin');
        targetRecipients.push({ id: 'admin', role: 'college_admin', link: '/notice' });
      }
      const cIdStr = collegeId?.toString();
      if (cIdStr && !seenIds.has(cIdStr)) {
        seenIds.add(cIdStr);
        targetRecipients.push({ id: cIdStr, role: 'college_admin', link: '/notice' });
      }
    }

    console.log(`📢 Notifying ${targetRecipients.length} recipients for Notice "${title}" (Audience: ${audience}, PostedBy: ${postedBy})`);

    // 4. Save In-App Live Notifications in Database
    if (targetRecipients.length > 0) {
      const notifsToInsert = targetRecipients.map(r => ({
        userId: r.id,
        role: r.role,
        title,
        message,
        type: 'Notice',
        link: r.link,
        isRead: false,
        collegeId
      }));
      await LiveNotification.insertMany(notifsToInsert);
    }

    // 5. Real-time Socket.IO emission
    if (io) {
      const socketPayload = {
        title,
        message,
        type: 'Notice',
        link: '/student/notices',
        noticeId,
        postedBy,
        collegeId: collegeId.toString(),
        createdAt: new Date()
      };

      targetRecipients.forEach(r => {
        io.to(`user_${r.id}`).emit('new_student_notification', {
          ...socketPayload,
          link: r.link,
          recipientId: r.id
        });
        io.to(`student_${r.id}`).emit('new_student_notification', {
          ...socketPayload,
          link: r.link,
          recipientId: r.id
        });
        io.to(`user_${r.id}`).emit('new_notification', {
          ...socketPayload,
          link: r.link,
          recipientId: r.id
        });

        if (connectedUsers) {
          const socketId = connectedUsers.get(r.id);
          if (socketId) {
            io.to(socketId).emit('new_student_notification', {
              ...socketPayload,
              link: r.link,
              recipientId: r.id
            });
            io.to(socketId).emit('new_notification', {
              ...socketPayload,
              link: r.link,
              recipientId: r.id
            });
          }
        }
      });

      // Dual-channel broadcast with recipient IDs
      io.to(`college_${collegeId}`).emit('new_student_notification_broadcast', {
        ...socketPayload,
        recipientIds: targetRecipients.map(r => r.id.toString())
      });

      // Global refresh events across the college
      io.to(`college_${collegeId}`).emit('notices_updated', { collegeId: collegeId.toString(), noticeId });
      io.to(`college_${collegeId}`).emit('student_content_updated', {
        type: 'Notice',
        collegeId: collegeId.toString(),
        noticeId
      });
      io.to(`college_${collegeId}`).emit('live-notification', socketPayload);
    }

    // 6. Firebase Cloud Messaging Push
    try {
      const pushPayload = {
        title,
        body: message,
        data: {
          link: '/student/notices',
          type: 'Notice',
          noticeId: String(noticeId || ''),
          collegeId: collegeId.toString()
        }
      };

      if (allTokens.length > 0) {
        console.log(`📱 Sending FCM multicast push to ${allTokens.length} devices for Notice...`);
        await sendMulticastPush(allTokens, pushPayload);
      }

      if (isStudentsTargeted) {
        await sendTopicPush(`college_${collegeId}_students`, pushPayload).catch(() => {});
      }
      if (isStaffTargeted) {
        await sendTopicPush(`college_${collegeId}_teachers`, pushPayload).catch(() => {});
      }
    } catch (fcmErr) {
      console.warn('⚠️ FCM notice push error:', fcmErr.message);
    }

    return { count: targetRecipients.length };
  } catch (err) {
    console.error('❌ Error in notifyAudienceOfNotice:', err);
    return { error: err.message };
  }
};

module.exports = { notifyStudentsOfClass, notifyAudienceOfNotice };
