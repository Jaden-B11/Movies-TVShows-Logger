import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';


const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));

//for Express to get values using POST method
app.use(express.urlencoded({extended:true}));

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'cst336 csumb',
  resave: false,
  saveUninitialized: true,
//   cookie: { secure: true }   //only used when ran on server not localhost
}))

//setting up database connection pool
const pool = mysql.createPool({
    host: "jayson-basilio.tech",
    user: "jaysonba_finalUser",
    password: "Final-Project-CSUMB-336",
    database: "jaysonba_media_logger",
    connectionLimit: 10,
    waitForConnections: true
});

const conn = await pool.getConnection();

//display list of authors 
app.get('/', (req, res) => {
   res.render('login.ejs');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.render('login.ejs')
 });

 app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
    try {
        let username = req.body.username;
        let password = req.body.password;
        let password2 = req.body.password2;

        if (password != password2){
            res.render('signup.ejs', {"error":"Passwords do not match"});
            return;
        }

        // Check if username already exists
        let checkSql = `SELECT * FROM Users WHERE username = ?`;
        const [rows] = await conn.query(checkSql, [username]);

        if (rows.length > 0) {
            res.render('signup.ejs', { error: "Username already taken" });
        } else {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            let insertSql = `INSERT INTO Users (username, password) VALUES (?, ?)`;
            const [rows] = await conn.query(insertSql, [username, hashedPassword]);
            res.redirect('/'); // After signup, redirect to login page
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    } finally {
        conn.release();
    }
});



 app.post('/login', async (req, res) => {
    let username = req.body.username; //req.query if using get instead of post
    let password = req.body.password;

    let hashedPassword = "";
    //let hashedPassword = "$2b$10$xOSJuYc8Z6z1eRptX4cubuouwtQmNJ28fWBoJDrUEUfxt4KIUytny";

    let sql = `SELECT * FROM Users WHERE username = ?`;

    const [rows] = await conn.query(sql, [username]);
    if (rows.length > 0) {
        hashedPassword = rows[0].password;
    }
    const match = await bcrypt.compare(password, hashedPassword);

    if (match){
        req.session.userAuthenticated = true;
        // req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
        req.session.Name = rows[0].username;
        res.render('home.ejs', { Name: req.session.Name });
    } else {
        res.render('login.ejs', {"error":"Username and password do not match"});
    }
 });



function isAuthenticated(req, res, next){
    if (req.session.userAuthenticated){
        next();
    } else {
        res.redirect("/");
    }
}

app.listen(3000, () => {
   console.log('server started');
});