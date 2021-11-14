const express = require('express')
const { MongoClient } = require('mongodb');
// const ObjectId = require("mongodb").ObjectId;
const admin = require("firebase-admin");
const cors = require('cors');

require('dotenv').config();

const app = express()
const port = process.env.PORT || 5000;


// Connection between admin sdk and firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


//set the middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwh5y.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//Token Varify
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}


async function run() {
    try {


        await client.connect();
        console.log('database is connected');

        const database = client.db("iPhone_BD");
        const orderCollection = database.collection("orders");
        const userCollection = database.collection("users");
        const productsCollection = database.collection('products');
        const iphonesCollection = database.collection('iphones');

        //GET API FOR ALL PRODUCTS
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray()
            res.send(products)
        })
        //GET API FOR ALL iPHONES
        app.get('/iphones', async (req, res) => {
            const cursor = iphonesCollection.find({});
            const iphones = await cursor.toArray()
            res.send(iphones)
        })

        //GET THE API 
        app.get("/orders", verifyToken, async (req, res) => {
            const email = req.query.email;

            const query = { email: email }
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        //  POST THE API TO MONGO-DB FOR ORDERS
        app.post('/orders', async (req, res) => {
            const order = req.body;
            console.log('hit the post', order);
            const result = await orderCollection.insertOne(order)
            console.log(result);
            res.send(result);
        });

        //  POST THE API TO MONGO-DB FOR USERS
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user)
            console.log(result);
            res.send(result);
        });





        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let isAdmin = false;

            if (user?.role === 'admin') {
                isAdmin = true;
            }

            res.json({ admin: isAdmin });

        })

        //UPDATE API (USING UPSERT)
        app.put('/users', async (req, res) => {

            const user = req.body;
            const filter = { email: user.email }
            const option = { upsert: true };

            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, option);
            res.json(result);

        });

        // MAKE AN ADMIN
        app.put('/users/admin', verifyToken, async (req, res) => {

            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not  have the  access to make an admin' })
            }
            // const filter = { email: user.email }
            // const option = { upsert: true };

            // const updateDoc = {
            //     $set: { role: 'admin' }
            // };
            // const result = await userCollection.updateOne(filter, updateDoc);
            // res.json(result);

        });

    }
    finally {
        // await client.close()
    }

}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Iphone server is running...')
})

app.listen(port, () => {
    console.log(`Server is  listening at http://localhost:${port}`)
})