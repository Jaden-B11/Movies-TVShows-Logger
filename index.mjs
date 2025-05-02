import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';
import fetch from 'node-fetch';



const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));

//for Express to get values using POST method
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'cst336 csumb',
    resave: false,
    saveUninitialized: true,
    //   cookie: { secure: true }   //only used when ran on server not localhost
}))

app.use((req, res, next) => {
    res.locals.Name = req.session.Name;
    next();
});

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

app.get('/home', isAuthenticated, (req, res) => {
    res.render('home.ejs');
});

app.get('/search', isAuthenticated, async (req, res) => {
    const searchTerm = req.query.title;
    const apiKey = "e3a66506";
    const maxPages = 5; // Adjust as needed
    let allMovies = [];

    if (!searchTerm) {
        return res.render('search.ejs', { movies: null, error: null });
    }

    try {
        for (let page = 1; page <= maxPages; page++) {
            const response = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(searchTerm)}&page=${page}`);
            const data = await response.json();

            if (data.Response === "True") {
                allMovies = allMovies.concat(data.Search);
            } else {
                break; // No more results
            }
        }

        // // Sort movies by year in descending order
        // allMovies.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));

        res.render('search.ejs', { movies: allMovies, error: null, searchTerm });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching movie data");
    }
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

        if (password.length < 3) {
            res.render('signup.ejs', { "error": "Password must be at least 4 characters long" });
            return;
        }

        if (password != password2) {
            res.render('signup.ejs', { "error": "Passwords do not match" });
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

    if (match) {
        req.session.userAuthenticated = true;
        // req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
        req.session.Name = rows[0].username;
        req.session.userId = rows[0].userId;
        res.render('home.ejs', { Name: req.session.Name });
    } else {
        res.render('login.ejs', { "error": "Username and password do not match" });
    }
});

app.get('/full-details/:id', isAuthenticated, async (req, res) => {
    const currentID = req.params.id;
    const searchTitle = req.query.title;
    console.log(searchTitle);
    const apiKey = "e3a66506";

    const response = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&i=${currentID}&plot=full`);
    const movie = await response.json();

    res.render('fulldetails.ejs', { movie, searchTitle });
});

app.get('/addSeries/:id', isAuthenticated, async (req, res) => {
    const currentId = req.params.id;

    const response = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${currentId}`);
    const media = await response.json();
    res.render('addSeries.ejs', { media });
});

app.post('/addSeries/:id', isAuthenticated, async (req, res) => {
    let userId = req.session.userId;
    let tvMazeId = req.body.tvMazeId;
    let showName = req.body.showName;
    let showImage = req.body.showImage;
    let showStatus = req.body.showStatus;
    let comments = req.body.comments;

    let sql = `INSERT INTO Movies 
                (userId, tvMazeId, showName, showImage, showStatus, comments) 
                VALUES 
                (?, ?, ?, ?, ?, ?)`;

    let sqlParams = [userId, tvMazeId, showName, showImage, showStatus, comments];
    const [rows] = await conn.query(sql, sqlParams);

    res.redirect("/full-details/:id");
});

app.get('/addMedia/:id', isAuthenticated, async (req, res) => {
    const currentId = req.params.id;
    const searchTitle = req.params.searchTitle;
    const apiKey = "e3a66506";

    const response = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&i=${currentId}&plot=full`);
    const movie = await response.json();
    res.render('addMedia.ejs', { movie, searchTitle });
});

app.post('/addMedia/:id', isAuthenticated, async (req, res) => {
    let userId = req.session.userId;
    let imdbId = req.body.imdbId;
    let movieName = req.body.movieName;
    let movieImage = req.body.movieImage;
    let movieStatus = req.body.movieStatus;
    let comments = req.body.comments;

    let sql = `INSERT INTO Movies 
                (userId, imdbId, movieName, movieImage, movieStatus, comments) 
                VALUES 
                (?, ?, ?, ?, ?, ?)`;

    let sqlParams = [userId, imdbId, movieName, movieImage, movieStatus, comments];
    const [rows] = await conn.query(sql, sqlParams);

    res.redirect(`/full-details/${imdbId}`,);
});

app.get('/viewEpisodes/:id/', isAuthenticated, async (req, res) => {
    const currentId = req.params.id;
    const selectedSeason = parseInt(req.query.season) || 1;

    const response = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${currentId}`);
    const media = await response.json();

    const tvMazeId = media.id

    // console.log(tvMazeId);

    // naruto error where the episode names are in japanese since the english translation is in the alternative lists
    // 

    const episodesResponse = await fetch(`https://api.tvmaze.com/shows/${tvMazeId}/episodes`);
    const allEpisodes = await episodesResponse.json();

    const seasons = {};
    allEpisodes.forEach(ep => {
        const season = ep.Season || 1;
        if (!seasons[season]) seasons[season] = [];
        seasons[season].push(ep);
    });

    const totalSeasons = Object.keys(seasons).length;
    const episodes = seasons[selectedSeason] || [];

    res.render('viewEpisodes', {
        tvMazeId,
        seasonNumber: selectedSeason,
        totalSeasons,
        episodes,
        searchTitle: req.query.title
    });
});


function isAuthenticated(req, res, next) {
    if (req.session.userAuthenticated) {
        next();
    } else {
        res.redirect("/");
    }
}

app.listen(3000, () => {
    console.log('server started');
});