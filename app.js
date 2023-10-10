//--------------
// LOAD PACKAGES
//--------------
const express = require("express"); // loads the express package
const { engine } = require("express-handlebars"); // loads handlebars for Express
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");
const session = require("express-session");
const connectSqlite3 = require("connect-sqlite3");
//const cookieParser = require("cookie-parser");

const port = 8050; // defines the port
const app = express(); // creates the Express application

const db = new sqlite3.Database("Web development Portfolio.db");

// defines handlebars engine
app.engine("handlebars", engine());
// defines the view engine to be handlebars
app.set("view engine", "handlebars");
// defines the views directory
app.set("views", "./views");

// define static directory "public" to access css/ and img/
app.use(express.static("public"));

// MODEL (DATA)
const projects = [
  { id: "0", name: "Jerome" },
  { id: "1", name: "Mira" },
  { id: "2", name: "Linus" },
  { id: "3", name: "Susanne" },
  { id: "4", name: "Jasmin" },
];

const users = [
  {
    id: "0",
    userName: "loka",
    userPassword: "admin",
  },
];

//-------------
// MIDDLEWARES
//-------------

// define static directory "public"
app.use(express.static("public"));

//-------------
// POST FORMS
//-------------

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//-------------
// SESSION
//-------------

//store sessions in the database
const SQLiteStore = connectSqlite3(session);

//define the session
app.use(
  session({
    store: new SQLiteStore({ db: "session-db.db" }),
    saveUninitialized: false,
    resave: false,
    secret: "SUPERgood@secret!!CSDFeD%%%Sentence",
  })
);

//-------------
// LOGIN PAGE
//-------------

app.post("/login", (req, res) => {
  const un = req.body.un;
  const pw = req.body.pw;

  if (un === "12" && pw === "32") {
    req.session.isAdmin = true;
    req.session.isLoggedin = true;
    req.session.name = "Ludwig";
    console.log(req.session.isLoggedin);
    res.redirect("/");
  } else {
    req.session.isAdmin = false;
    req.session.isLoggedin = false;
    req.session.name = "";
    console.log("LOGIN IN ERROR");
    res.redirect("/login");
  }
});
// defines route "/login"
app.get("/login", function (req, res) {
  const model = {};
  res.render("login.handlebars", model);
});

//-------------
// HOME PAGE
//-------------

app.get("/", function (req, res) {
  console.log("Session: ", req.session);
  const model = {
    isLoggedin: req.session.isLoggedin,
    isAdmin: req.session.isAdmin,
    name: req.session.name,
  };
  res.render("home.handlebars", model);
});

//-------------
// ABOUT PAGE
//-------------

// defines route "/about"
app.get("/about", function (req, res) {
  const model = {
    listProjects: projects,
    isLoggedin: req.session.isLoggedin,
    isAdmin: req.session.isAdmin,
    name: req.session.name,
  };

  res.render("about.handlebars", model);
});
//define route "/about/id"
app.get("/about/:id", function (req, res) {
  const id = req.params.id;
  const model = projects[id];
  res.render("project.handlebars", model);
});

//---------------
// PROJECTS PAGE
//---------------

// renders the /projects route view
app.get("/projects", (req, res) => {
  db.all("SELECT * FROM project", function (error, theProjects) {
    if (error) {
      const model = {
        dbError: true,
        theError: error,
        projects: [],
        isLoggedin: req.session.isLoggedin,
        isAdmin: req.session.isAdmin,
        name: req.session.name,
      };
      // renders the page with the model
      res.render("projects.handlebars", model);
    } else {
      const model = {
        dbError: false,
        theError: "",
        projects: theProjects,
        isLoggedin: req.session.isLoggedin,
        isAdmin: req.session.isAdmin,
        name: req.session.name,
      };
      // renders the page with the model
      res.render("projects.handlebars", model);
    }
  });
});

// DELETE PROJECTS PAGE
//----------------------

app.get("/projects/delete/:id", (req, res) => {
  const id = req.params.id;
  if (req.session.isLoggedin === true && req.session.isAdmin === true) {
    db.run(
      "DELETE FROM project WHERE projectID=?",
      [id],
      function (error, theProjects) {
        if (error) {
          const model = {
            dbError: true,
            theError: error,
            isLoggedin: req.session.isLoggedin,
            isAdmin: req.session.isAdmin,
            name: req.session.name,
          };
          res.render("home.handlebars", model); //renders the page with the model
        } else {
          const model = {
            dbError: false,
            theError: "",
            isLoggedin: req.session.isLoggedin,
            isAdmin: req.session.isAdmin,
            name: req.session.name,
          };
          res.render("home.handlebars", model); //renders the page with the model
        }
      }
    );
  } else {
    res.redirect("/login");
  }
});

// ADD PROJECTS PAGE
//----------------------

// sends the form for a new project
app.get("/projects/new", (req, res) => {
  if (req.session.isLoggedin === true && req.session.isAdmin === true) {
    const model = {
      isLoggedin: req.session.isLoggedin,
      isAdmin: req.session.isAdmin,
      name: req.session.name,
    };
    res.render("newproject.handlebars", model);
  } else {
    res.redirect("/login");
  }
});

// creates a new project
app.post("/projects/new", (req, res) => {
  const newp = [
    req.body.projectName,
    req.body.projectDate,
    req.body.projectDescription,
    req.body.projectImage,
  ];

  if (req.session.isLoggedin === true && req.session.isAdmin === true) {
    db.run(
      "INSERT INTO project (projectName, projectDate, projectDescription, projectImage) VALUES (?, ?, ?, ?)",
      newp,
      (error) => {
        if (error) {
          console.log("ERROR: ", error);
        } else {
          console.log("Line added into the projects table!");
        }
        res.redirect("/projects");
      }
    );
  } else {
    res.redirect("/login");
  }
});

// UPDATE PROJECTS PAGE
//----------------------

// sends the form to modify a project
app.get("/projects/update/:id", (req, res) => {
  const id = req.params.id;
  //console.log("UPDATE: ", id)
  db.get(
    "SELECT * FROM project WHERE projectID=?",
    [id],
    function (error, theProject) {
      if (error) {
        console.log("ERROR: ", error);
        const model = {
          dbError: true,
          theError: error,
          project: {},
          isLoggedin: req.session.isLoggedin,
          isAdmin: req.session.isAdmin,
          name: req.session.name,
        };
        // renders the page with the model
        res.render("modifyproject.handlebars", model);
      } else {
        //console.log("MODIFY: ", JSON.stringify(theProject))
        //console.log("MODIFY: ", theProject)
        const model = {
          dbError: false,
          theError: "",
          project: theProject,
          isLoggedin: req.session.isLoggedin,
          isAdmin: req.session.isAdmin,
          name: req.session.name,
        };
        // renders the page with the model
        res.render("modifyproject.handlebars", model);
      }
    }
  );
});

// modifies an existing project
app.post("/projects/update/:id", (req, res) => {
  const id = req.params.id; // gets the id from the dynamic parameter in the route
  const newp = [
    req.body.projectName,
    req.body.projectDate,
    req.body.projectDescription,
    req.body.projectImage,
    id,
  ];

  if (req.session.isLoggedin === true && req.session.isAdmin === true) {
    db.run(
      "UPDATE project SET projectName=?, projectDate=?, projectDescription=?, projectImage=? WHERE projectID=?",
      newp,
      (error) => {
        if (error) {
          console.log("ERROR: ", error);
        } else {
          console.log("Project updated!");
        }
        res.redirect("/projects");
      }
    );
  } else {
    res.redirect("/login");
  }
});

//-------------
// CONTACT PAGE
//-------------

// defines route "/contact"
app.get("/contact", function (req, res) {
  const model = {
    isLoggedin: req.session.isLoggedin,
    isAdmin: req.session.isAdmin,
    name: req.session.name,
  };
  res.render("contact.handlebars", model);
});

//-------------
// LOGOUT PAGE
//-------------

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    console.log("Error while destroying the session: ", err);
  });
  console.log("Logged out");
  res.redirect("/");
});
//-------------
// ERROR PAGE
//-------------

// defines the final default route 404 NOT FOUND
app.use(function (req, res) {
  res.status(404).render("404.handlebars");
});

//---------------
// PORT LISTENER
//---------------

// runs the app and listens to the port
app.listen(port, () => {
  console.log(`Server running and listening on port ${port}...`);
});
