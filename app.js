require('dotenv').config();
const express = require('express');
const app = express();
const Payment = require('./models/Payment');

const Razorpay = require('razorpay');
const connectDB = require('./config/mongodb');

connectDB();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/create/orderId/', async (req, res) => {

    /* 100 paisa = 1 rupee  */


    const options = {
        amount: 5000 * 100, // amount in smallest currency unit
        currency: "INR",
    };
    try {
        const order = await razorpay.orders.create(options);

        console.log(order);

        res.send(order);

        const newPayment = await Payment.create({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            status: 'pending',
        });

    } catch (error) {
        res.status(500).send('Error creating order');
    }
});


app.post('/api/payment/verify', async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET

    try {
        const { validatePaymentVerification } = require('./node_modules/razorpay/dist/utils/razorpay-utils.js')

        const result = validatePaymentVerification({ "order_id": razorpayOrderId, "payment_id": razorpayPaymentId }, signature, secret);
        if (result) {
            const payment = await Payment.findOne({ orderId: razorpayOrderId });
            payment.paymentId = razorpayPaymentId;
            payment.signature = signature;
            payment.status = 'completed';
            await payment.save();
            res.json({ status: 'success' });
        } else {
            res.status(400).send('Invalid signature');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Error verifying payment');
    }
});



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
