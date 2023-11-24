const express = require('express');
const cors = require('cors');
const { default: mongoose } = require('mongoose');
const User = require('./models/User.js');
const Post = require('./models/Post.js')
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');

const salt = bcrypt.genSaltSync(10);
const secret = "ajbhfqoehqcuhfbvqpwuyhr";

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'))

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

  app.post('/publicacao', uploadMiddleware.single('file'), async (req, res) => {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  
    const { token } = req.cookies;
    try {
      jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
  
        const { title, summary, content } = req.body;
        const postDoc = await Post.create({
          title,
          summary,
          content,
          cover: newPath,
          author: info.id,
        });

        res.json(postDoc);
      });
    } catch (err) {
      res.status(401).json('Token inválido');
    }
  });

  app.put('/publicacao',uploadMiddleware.single('file'), async (req,res) => {
    let newPath = null;
    if (req.file) {
      const {originalname,path} = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      newPath = path+'.'+ext;
      fs.renameSync(path, newPath);
    }
  
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async (err,info) => {
      if (err) throw err;
      const {id,title,summary,content} = req.body;
      const postDoc = await Post.findById(id);
      const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
        return res.status(400).json('you are not the author');
      }
      await postDoc.updateOne({
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover,
      });
  
      res.json(postDoc);
    });
  
  });

  app.get('/publicacao', async (req, res) => {
    res.json(
      await Post.find()
    .populate('author', ['username'])
    .sort({createdAt: -1})
    )
  })
  

  app.get('/publicacao/:id', async (req,res)=>{
    const {id} = req.params
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc)
  })

app.listen(4000, () => {
    console.log('Server is running on port: 4000');
});
