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

app.get('/home', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;

    let sql = `SELECT * FROM Movies WHERE userId = ?`;
    let sql2 = `SELECT * FROM Shows WHERE userId = ?`;

    const [movies] = await conn.query(sql, [userId]);
    const [shows] = await conn.query(sql2, [userId]);

    const grouped = {
        watching: { movies: [], shows: [] },
        planned: { movies: [], shows: [] },
        completed: { movies: [], shows: [] },
        dropped: { movies: [], shows: [] },
    };

    console.log(shows);
    console.log(movies);

    for (let movie of movies) {
        const status = movie.movieStatus?.toLowerCase();
        if (status === "watching") {
            grouped.watching.movies.push(movie);
        } else if (status === "planned to watch") {
            grouped.planned.movies.push(movie);
        } else if (status === "completed") {
            grouped.completed.movies.push(movie);
        } else if (status === "dropped") {
            grouped.dropped.movies.push(movie);
        }
    }
    
    for (let show of shows) {
        const status = show.showStatus?.toLowerCase();
        if (status === "watching") {
            grouped.watching.shows.push(show);
        } else if (status === "planned to watch") {
            grouped.planned.shows.push(show);
        } else if (status === "completed") {
            grouped.completed.shows.push(show);
        } else if (status === "dropped") {
            grouped.dropped.shows.push(show);
        }
    }


    res.render('home.ejs', { grouped });
});

app.get('/search', isAuthenticated, async (req, res) => {
    const searchTerm = req.query.title?.trim(); // Optional chaining and trimming whitespace
    const apiKey = "e3a66506";
    const maxPages = 5;
    let allMovies = [];

    if (!searchTerm || searchTerm.length === 0) {
        return res.render('search.ejs', { movies: null, error: null, searchTerm: null });
    }

    try {
        for (let page = 1; page <= maxPages; page++) {
            const response = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(searchTerm)}&page=${page}`);
            const data = await response.json();

            if (data.Response === "True") {
                allMovies = allMovies.concat(data.Search);
            } else {
                return res.render('search.ejs', { movies: null, error: 'No matching results, Try again!', searchTerm: null }); // Search term exists, but no results
            }
        }

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
        res.redirect('/home');
    } else {
        res.render('login.ejs', { "error": "Username and password do not match" });
    }
});

app.get('/full-details/:id', isAuthenticated, async (req, res) => {
    const currentID = req.params.id;
    const searchTitle = req.query.title;
    console.log(searchTitle);
    const success = req.query.success;
    const apiKey = "e3a66506";

    const response = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&i=${currentID}&plot=full`);
    const movie = await response.json();

    res.render('fulldetails.ejs', { movie, searchTitle, success });
});

app.post('/addSeries/:id', isAuthenticated, async (req, res) => {
    let userId = req.session.userId;
    let imdbId = req.body.imdbId;
    let showName = req.body.showName;
    let showImage = req.body.showImage;
    let showStatus = req.body.showStatus;
    let comments = req.body.comments;

    const searchTitle = req.body.searchTitle;

    // use imdbId to get tvMazeId
    const response = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
    const data = await response.json();

    // gets tvMazeId from api response
    const tvMazeId = parseInt(data.id);

    let sql = `INSERT INTO Shows 
                (userId, tvMazeId, showName, showImage, showStatus, comments) 
                VALUES 
                (?, ?, ?, ?, ?, ?)`;

    let sqlParams = [userId, tvMazeId, showName, showImage, showStatus, comments];
    const [rows] = await conn.query(sql, sqlParams);

    res.redirect(`/full-details/${imdbId}?title=${searchTitle}&success=1`);
});

app.post('/addEpisode', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const imdbId = req.query.imdbId;

    const { showTvMazeLink, tvMazeId, episodeName, episodeImage, status, comments } = req.body;

    // for getting tv show TVMaze id
    const url = showTvMazeLink;
    const match = url.match(/\/shows\/(\d+)$/);
    const showTvMazeId = match ? parseInt(match[1]) : null;


    // Checks if the user already added the show before
    const [existingShows] = await conn.query(
        'SELECT * FROM Shows WHERE tvMazeId = ? AND userId = ?',
        [showTvMazeId, userId]
    );

    // Inserts the show for the user with the same status as what they added in the episode 
    // if show doesn't exist in database
    if (existingShows.length === 0) {
        const apiKey = "e3a66506";
        const omdbResponse = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&i=${imdbId}&plot=full`);
        const showData = await omdbResponse.json();

        const showName = showData.Title;
        const showImage = showData.Poster;

        const insertShowSql = `
          INSERT INTO Shows (userId, tvMazeId, showName, showImage, showStatus)
          VALUES (?, ?, ?, ?, ?)
        `;
        const showParams = [userId, showTvMazeId, showName, showImage, status];
        await conn.query(insertShowSql, showParams);
    }

    // Gets showId for user to help with inserting episode entry
    const [shows] = await conn.query(
        'SELECT showId FROM Shows WHERE tvMazeId = ? AND userId = ?',
        [showTvMazeId, userId]
    );

    const showId = shows[0].showId;

    // Finally inserts episode into database
    const insertEpisodeSql = `
        INSERT INTO Episodes (showId, userId, tvMazeId, episodeName, episodeImage, episodeStatus, comments)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
    const episodeParams = [showId, userId, tvMazeId, episodeName, episodeImage, status, comments];
    await conn.query(insertEpisodeSql, episodeParams);

    res.redirect(`/viewEpisodes/${imdbId}`);
});

app.get('/addMedia/:id', isAuthenticated, async (req, res) => {
    const currentId = req.params.id;
    const searchTitle = req.query.title;
    const success = req.query.success;
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

    const searchTitle = req.body.searchTitle;

    let sql = `INSERT INTO Movies 
                (userId, imdbId, movieName, movieImage, movieStatus, comments) 
                VALUES 
                (?, ?, ?, ?, ?, ?)`;

    let sqlParams = [userId, imdbId, movieName, movieImage, movieStatus, comments];
    const [rows] = await conn.query(sql, sqlParams);

    res.redirect(`/full-details/${imdbId}?title=${searchTitle}&success=1`);
});

app.get('/viewEpisodes/:id/', isAuthenticated, async (req, res) => {
    const currentId = req.params.id;
    const selectedSeason = parseInt(req.query.season) || 1;

    const response = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${currentId}`);
    const media = await response.json();

    if (!media || !media.id) {
        return res.status(404).send("TV show not found for this IMDb ID.");
    }

    const tvMazeId = media.id;

    // naruto error where the episode names are in japanese since the english translation is in the alternative lists
    // 

    const episodesResponse = await fetch(`https://api.tvmaze.com/shows/${tvMazeId}/episodes`);
    const allEpisodes = await episodesResponse.json();

    const seasons = {};
    allEpisodes.forEach(ep => {
        const season = ep.season || 1;
        if (!seasons[season]) seasons[season] = [];
        seasons[season].push(ep);
    });

    const totalSeasons = Math.max(...Object.keys(seasons).map(Number));
    const episodes = seasons[selectedSeason] || [];

    res.render('viewEpisodes', {
        currentId,
        seasonNumber: selectedSeason,
        totalSeasons,
        episodes,
        searchTitle: req.query.title
    });
});

app.post('/editMedia', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;

    const mediaId = req.body.mediaId;
    const mediaType = req.body.mediaType;
    const status = req.body.status;
    const comments = req.body.comments;

    let sql;
    if(mediaType == 'movie'){
        sql = `UPDATE Movies SET movieStatus = ?, comments = ? WHERE movieId = ? and userId = ?`
    } else if (mediaType == 'show'){
        sql = `UPDATE Shows SET showStatus = ?, comments = ? WHERE showId = ? AND userId = ?`;
    }
    let sqlParams = [status, comments, mediaId, userId]
    await conn.query(sql, sqlParams);

    res.redirect('/home');
});

// app.post('/deleteMedia', isAuthenticated, async (req, res) => {
//     const { mediaId, mediaType } = req.body;
//     const userId = req.session.userId;
  
//     let sql;
//     if (mediaType === 'movie') {
//       sql = `DELETE FROM Movies WHERE movieId = ? AND userId = ?`;
//     } else if (mediaType === 'show') {
//       sql = `DELETE FROM Shows WHERE showId = ? AND userId = ?`;
//     }
  
//     await conn.query(sql, [mediaId, userId]);
//     res.redirect('/home');
//   });

app.post('/deleteMedia', isAuthenticated, async (req, res) => {
    const mediaId = req.body.mediaId
    const mediaType = req.body.mediaType
    const userId = req.session.userId
    let sql;
    
    if(mediaType == 'movie'){
        sql = `DELETE FROM Movies WHERE movieId = ? AND userId = ?`;
    } else if (mediaType == 'show') {
        sql = `DELETE FROM Shows WHERE showId = ? AND userId = ?`;
    }

    let sqlParams = [mediaId, userId]
    await conn.query(sql, sqlParams);

    res.redirect('/home')
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