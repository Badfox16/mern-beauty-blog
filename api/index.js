const express = require('express');
const cors = require('cors');
const { default: mongoose } = require('mongoose');
const User = require('./models/User.js');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const salt = bcrypt.genSaltSync(10);
const secret = "ajbhfqoehqcuhfbvqpwuyhr";

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());

mongoose.connect("mongodb+srv://isabel:avontrack@cluster0.mtshln4.mongodb.net/avon_track?retryWrites=true&w=majority")

app.post('/registro', async (req, res) => {
    console.log(req.body);
    const { username, password } = req.body;
    try {
        const UserDoc = await User.create({
            username,
            password: bcrypt.hashSync(password, salt),
        })
        res.json(UserDoc);
    } catch (e) {
        console.error(e.message);
    }
});

app.post('/entrar', async (req, res) => {
    const { username, password } = req.body;
    const UserDoc = await User.findOne({ username });

    const passOk = bcrypt.compareSync(password, UserDoc.password);
   
    if (passOk) {
        //Se logar
        console.log("Chamada ao metodo de login")
        jwt.sign({username, id: UserDoc._id}, secret, {}, (err, token)=>{
            if (err) throw err;
            res.cookie('token', token).json({
                id: UserDoc._id,
                username,
            })
        })

    } else {
        res.status(401).json("Credenciais erradas")
    }
})

app.get('/perfil', (req, res) => {
    const { token } = req.cookies
  
    try {
      jwt.verify(token, secret, {}, (err, info) => {
        if (err) throw err;
        res.json(info)
      })
    } catch (err) {
      res.status(401).json('Token inválido')
    }
  })

app.post('/logout', (req,res) => {
    res.cookie('token', '', { expires: new Date(0) }).json('ok');
  });

app.listen(4000, () => {
    console.log('Server is running on port 4000');
});
//avontrack