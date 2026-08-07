const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:KoJGvdKsGU9IQQvk@cluster0.9ssqshr.mongodb.net/crm_clg_dct?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  const payments = await db.collection('feepayments').find().toArray();
  const ledgers = await db.collection('studentfees').find().toArray();
  
  for (let l of ledgers) {
    let paid = 0;
    payments.forEach(p => {
      if (p.enrollNo === l.enrollNo) {
        paid += p.amount;
      }
    });
    
    const totalFee = l.totalFee || 0;
    const discount = l.discount || 0;
    const scholarship = l.scholarship || 0;
    const fine = l.fine || 0;
    
    let pending = totalFee - paid - discount - scholarship + fine;
    if (pending < 0) pending = 0;
    
    let status = pending === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');
    
    await db.collection('studentfees').updateOne(
      { _id: l._id }, 
      { $set: { paid, pending, status } }
    );
    console.log('Updated ' + l.enrollNo + ': paid ' + paid + ', pending ' + pending);
  }
  process.exit(0);
});
