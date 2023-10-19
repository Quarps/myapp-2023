//--------------
// LOAD PACKAGES
//--------------
const express = require("express"); // loads the express package
const { engine } = require("express-handlebars"); // loads handlebars for Express
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");
const session = require("express-session");
const connectSqlite3 = require("connect-sqlite3");
const notifier = require("node-notifier");
const bcrypt = require("bcrypt");
//const cookieParser = require("cookie-parser");

// PORT & EXPRESS
//-----------------
const port = 8050; // defines the port
const app = express(); // creates the Express application

// CONNECTION OF THE DATA BASE
//----------------------------
const db = new sqlite3.Database("Web development Portfolio.db");

// MVC SETUP
//--------------
// defines handlebars engine
app.engine("handlebars", engine());
// defines the view engine to be handlebars
app.set("view engine", "handlebars");
// defines the views directory
app.set("views", "./views");

// EXPRESS STATIC
//-----------------
// define static directory "public" to access css/ and img/
app.use(express.static("public"));

//-------------
// MIDDLEWARES
//-------------

//post forms
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

// LOGIN
//----------------------

app.post("/login", (req, res) => {
  const userName = req.body.userName;
  const userPassword = req.body.userPassword;

  console.log("Username from request:", userName);
  console.log("Password from request:", userPassword);

  db.get(
    "SELECT * FROM user WHERE createUserName = ?",
    userName,
    (err, row) => {
      if (err) {
        console.error(err);
      } else if (row) {
        // User found in the database, compare the hashed password
        bcrypt.compare(
          userPassword,
          row.createUserPassword,
          function (err, result) {
            if (result === true) {
              // Passwords match, set session variables and redirect to the home page
              if (row.userRole === "admin") {
                req.session.isAdmin = true;
              }
              req.session.isLoggedin = true;
              req.session.name = row.firstName; // Use the user's name from the database
              res.redirect("/");
            } else {
              // Password doesn't match
              req.session.isAdmin = false;
              req.session.isLoggedin = false;
              req.session.name = "";
              console.log("Incorrect password");
              res.redirect("/login");
            }
          }
        );
      } else {
        // User not found in the database
        req.session.isAdmin = false;
        req.session.isLoggedin = false;
        req.session.name = "";
        console.log("User not found");
        res.redirect("/login");
      }
    }
  );
});

// DEFINES THE ROUTE
//----------------------
app.get("/login", function (req, res) {
  const model = {};
  res.render("login.handlebars", model);
});

// CREATE USER
//----------------------

const saltRounds = 10; // You can adjust the number of salt rounds as needed

app.post("/create-account", (req, res) => {
  const newUsername = req.body.createUserName;
  const newUser = [
    newUsername,
    req.body.firstName,
    req.body.lastName,
    req.body.userEmail,
    "user",
  ];

  // Check if the username already exists in the database
  db.get(
    "SELECT * FROM user WHERE createUserName = ?",
    newUsername,
    (err, row) => {
      if (err) {
        console.error(err);
      } else if (row) {
        // Username already exists, handle the error (e.g., send a response)
        console.log("Username already exists");
      } else {
        // Username is unique; proceed with hashing the password and user creation
        bcrypt.hash(
          req.body.createUserPassword,
          saltRounds,
          function (err, hash) {
            if (err) {
              console.log("Error", err);
            } else {
              console.log("Hashed password", hash);

              // Now that you have the hashed password, you can insert it into the database
              newUser.splice(1, 0, hash); // Insert the hashed password at index 1

              db.run(
                "INSERT INTO user (createUserName, createUserPassword, firstName, lastName, userEmail, userRole) VALUES (?, ?, ?, ?, ?, ?)",
                newUser,
                (error) => {
                  if (error) {
                    console.log("ERROR: ", error);
                    res.status(500).send("Account creation failed");
                  } else {
                    console.log("ACCOUNT CREATED");
                    res.redirect("/"); // Redirect the user after the account is created
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

//-------------
// HOME PAGE
//-------------

app.get("/", function (req, res) {
  console.log("Session: ", req.session);
  db.all(
    "SELECT * FROM project WHERE projectID IN (SELECT projectID FROM project ORDER BY RANDOM() LIMIT 3) ORDER BY RANDOM()",
    function (error, theProjects) {
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
        res.render("home.handlebars", model);
      }
    }
  );
});

//-------------
// ABOUT PAGE
//-------------

// RENDERS ABOUT PAGE
//----------------------
app.get("/about", function (req, res) {
  // Fetch all experiences from the database
  db.all("SELECT * FROM experience", (error, experiences) => {
    if (error) {
      console.error("Error fetching experiences:", error);
      // Handle the error as needed
      experiences = [];
    }

    // Separate the experiences into work and education based on expTopic
    const educationExperiences = experiences.filter(
      (exp) => exp.expTopic === "education"
    );
    const workExperiences = experiences.filter(
      (exp) => exp.expTopic === "work"
    );

    // Fetch competences from the database
    db.all("SELECT * FROM competence", (error, competences) => {
      if (error) {
        console.error("Error fetching competences:", error);
        // Handle the error as needed
        competences = [];
      }

      const model = {
        isLoggedin: req.session.isLoggedin,
        isAdmin: req.session.isAdmin,
        name: req.session.name,
        educationExperience: educationExperiences,
        workExperience: workExperiences,
        theCompetence: competences,
      };

      res.render("about.handlebars", model);
    });
  });
});

// DELETE COMPETENCE
//----------------------

app.get("/about/delete/:id", (req, res) => {
  const id = req.params.id;
  if (req.session.isLoggedin === true && req.session.isAdmin === true) {
    db.run(
      "DELETE FROM competence WHERE competenceID=?",
      [id],
      function (error, theCompetence) {
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

// ADD COMPETENCE
//--------------------

app.post("/about/add-competence", (req, res) => {
  if (req.session.isAdmin) {
    // Extract competenceName and competenceDate from req.body
    const competenceName = req.body.competenceName;
    const competenceDate = req.body.competenceDate;
    // Insert the new competence into the database
    db.run(
      "INSERT INTO competence (competenceName, competenceDate) VALUES (?, ?)",
      [competenceName, competenceDate],
      (error) => {
        if (error) {
          console.error("Error adding competence:", error);
          // Handle the error as needed
        }
        res.redirect("/about"); // Redirect back to the about page
      }
    );
  } else {
    res.redirect("/about"); // Redirect to the about page
  }
});

// UPDATE COMPETENCE
//--------------------

app.get("/about/update/:id", (req, res) => {
  const id = req.params.id;
  // console.log("UPDATE: ", id);
  db.get(
    "SELECT * FROM competence WHERE competenceID = ?",
    [id],
    function (error, theCompetence) {
      if (error) {
        console.log("ERROR: ", error);
        const model = {
          dbError: true,
          theError: error,
          competence: {}, // Use the correct variable name here
          isLoggedin: req.session.isLoggedin,
          isAdmin: req.session.isAdmin,
          name: req.session.name,
        };
        // renders the page with the model
        res.render("modifyabout.handlebars", model);
      } else {
        const model = {
          dbError: false,
          theError: "",
          competence: theCompetence, // Use the correct variable name here
          isLoggedin: req.session.isLoggedin,
          isAdmin: req.session.isAdmin,
          name: req.session.name,
        };
        // renders the page with the model
        res.render("modifyabout.handlebars", model);
      }
    }
  );
});

app.post("/about/update/:id", (req, res) => {
  const id = req.params.id; // gets the id from the dynamic parameter in the route
  const newCompetence = [req.body.competenceName, req.body.competenceDate, id];

  if (req.session.isLoggedin === true && req.session.isAdmin === true) {
    db.run(
      "UPDATE competence SET competenceName=?, competenceDate=? WHERE competenceID=?",
      newCompetence,
      (error) => {
        if (error) {
          console.log("ERROR: ", error);
        } else {
          console.log("Competence updated!");
        }
        res.redirect("/about");
      }
    );
  } else {
    res.redirect("/");
  }
});

//---------------
// PROJECTS PAGE
//---------------

// RENDER THE PROJECTS PAGE
//--------------------------
//OBS... Code UNDERNEATH inspired by Liam Melkersson
app.get("/projects", function (req, res) {
  //pagination variables
  const itemsPerPage = 3;
  const page = (req.query.page || 1) * 1;
  const offset = (page - 1) * itemsPerPage;

  db.all(
    `SELECT * FROM project LIMIT ${itemsPerPage} OFFSET ${offset}`,
    function (error, theProjects) {
      if (error) {
        const model = {
          dbError: true,
          theError: error,
          projects: [],
          isAdmin: req.session.isAdmin,
          isLoggedIn: req.session.isLoggedIn,
        };

        res.render("projects.handlebars", model);
      } else {
        db.get("SELECT COUNT(*) as count FROM project", function (error, row) {
          if (error) {
            console.error(error);
            return;
          }

          const totalProjects = row.count;

          // calculate pagination variables
          const totalPages = Math.ceil(totalProjects / itemsPerPage);
          const showPrevious = page > 1;
          const showNext = page < totalPages;

          // create an array of page numbers
          const pages = [];
          for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
          }

          const model = {
            dbError: false,
            theError: "",
            projects: theProjects,
            isAdmin: req.session.isAdmin,
            isLoggedIn: req.session.isLoggedIn,
            showPrevious,
            showNext,
            pages,
            prevPage: page > 1 ? page - 1 : null,
            nextPage: page < totalPages ? page + 1 : null,
          };

          console.log("PAGE: ", page); // Use the updated 'page' variable
          console.log("Next PAGE: ", model.nextPage);
          res.render("projects.handlebars", model);
        });
      }
    }
  );
});
//OBS... Code ABOVE inspired by Liam Melkersson

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
app.get("/project/new", (req, res) => {
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
app.post("/project/new", (req, res) => {
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

// PRODUCT OWN PAGE
//----------------------
app.get("/projects/view/:id", function (req, res) {
  const projectId = req.params.id;

  // Fetch the project details
  db.get(
    "SELECT * FROM project WHERE projectID = ?",
    [projectId],
    function (error, project) {
      if (error) {
        console.error("Error fetching project details:", error);
        // Handle the error as needed
        const model = {
          dbError: true,
          theError: error,
          project: {}, // Initialize an empty project object
          isLoggedin: req.session.isLoggedin,
          isAdmin: req.session.isAdmin,
          name: req.session.name,
          comments: [], // Initialize an empty array for comments
        };
        // Render the page with the model
        res.render("project.handlebars", model);
      } else {
        // Fetch comments associated with the project
        db.all(
          "SELECT c.commentHead, c.username, c.commentBody FROM comment AS c JOIN projectComment AS pc ON c.commentID = pc.commentID WHERE pc.projectID = ?",
          [projectId],
          function (error, comments) {
            if (error) {
              console.error("Error fetching comments:", error);
              // Handle the error as needed
            }

            const model = {
              dbError: false,
              theError: "",
              project: project,
              isLoggedin: req.session.isLoggedin,
              isAdmin: req.session.isAdmin,
              name: req.session.name,
              comments: comments, // Pass the fetched comments to the template
            };
            // Render the page with the model
            res.render("project.handlebars", model);
          }
        );
      }
    }
  );
});

//ADD COMMENT
//-------------
app.post("/projects/:id/newc", (req, res) => {
  const projectId = req.params.id; // Get the project ID from the URL
  const createUserName = req.session.name; // Get the logged-in user's username

  if (req.session.isLoggedin && createUserName) {
    const commentHead = req.body.commentHead;
    const commentBody = req.body.commentBody;
    console.log(commentHead);
    console.log(commentBody);

    // Check if the user is logged in and has a valid username

    db.run(
      "INSERT INTO comment (userName, commentHead, commentBody) VALUES (?, ?, ?)",
      [createUserName, commentHead, commentBody],
      function (error) {
        if (error) {
          console.error("Error adding comment:", error);
          // Handle the error as needed
        } else {
          const commentId = this.lastID; // Get the ID of the newly inserted comment
          db.run(
            "INSERT INTO projectComment (projectID, commentID) VALUES (?, ?)",
            [projectId, commentId],
            function (error) {
              if (error) {
                console.error("Error associating comment with project:", error);
                // Handle the error as needed
              }
            }
          );
        }
      }
    );

    // Redirect back to the project page with the correct project ID
    res.redirect(`/projects/${projectId}`);
  } else {
    res.redirect("/projects");
  }
});

// DELETE COMMENT (in progress)
//-----------------

app.get("/delete-comment/:id", (req, res) => {
  const id = req.params.id;
  if (req.session.isLoggedin === true && req.session.isAdmin === true) {
    db.run("DELETE FROM comment WHERE commentID = ?", [id], function (error) {
      if (error) {
        const model = {
          dbError: true,
          theError: error,
          isLoggedin: req.session.isLoggedin,
          isAdmin: req.session.isAdmin,
          name: req.session.name,
        };
        res.render("projects.handlebars", model);
      } else {
        const model = {
          dbError: false,
          theError: "",
          isLoggedin: req.session.isLoggedin,
          isAdmin: req.session.isAdmin,
          name: req.session.name,
        };
        res.render("projects.handlebars", model);
      }
    });
  } else {
    res.redirect("/projects");
  }
});

//-------------
// CONTACT PAGE
//-------------

// defines route "/contact"
app.get("/contact", function (req, res) {
  db.all("SELECT * FROM contactInformation", function (error, theContact) {
    if (error) {
      const model = {
        dbError: true,
        theError: error,
        contactInformation: [],
        isLoggedin: req.session.isLoggedin,
        isAdmin: req.session.isAdmin,
        name: req.session.name,
      };
      // renders the page with the model
      res.render("contact.handlebars", model);
    } else {
      const model = {
        dbError: false,
        theError: "",
        contactInformation: theContact,
        isLoggedin: req.session.isLoggedin,
        isAdmin: req.session.isAdmin,
        name: req.session.name,
      };
      // renders the page with the model
      res.render("contact.handlebars", model);
    }
  });
});

//-------------
// USERS PAGE
//-------------

// RENDERS USER PAGE
//---------------------

app.get("/users", (req, res) => {
  db.all("SELECT * FROM user", function (error, theUsers) {
    if (error) {
      const model = {
        dbError: true,
        theError: error,
        users: [],
        isLoggedin: req.session.isLoggedin,
        isAdmin: req.session.isAdmin,
        name: req.session.name,
      };
      // renders the page with the model
      res.render("users.handlebars", model);
    } else {
      const model = {
        dbError: false,
        theError: "",
        users: theUsers,
        isLoggedin: req.session.isLoggedin,
        isAdmin: req.session.isAdmin,
        name: req.session.name,
      };
      // renders the page with the model
      res.render("users.handlebars", model);
    }
  });
});

// DELETE USERS
//---------------------

app.get("/users/delete/:id", (req, res) => {
  const id = req.params.id;
  if (req.session.isLoggedin === true && req.session.isAdmin === true) {
    db.run("DELETE FROM user WHERE userID=?", [id], function (error, theUsers) {
      if (error) {
        const model = {
          dbError: true,
          theError: error,
          isLoggedin: req.session.isLoggedin,
          isAdmin: req.session.isAdmin,
          name: req.session.name,
        };
        res.render("home.handlebars", model);
        //renders the page with the model
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
    });
  } else {
    res.redirect("/users");
  }
});

// MODIFY USERS
//---------------------

app.get("/users/update/:id", (req, res) => {
  const id = req.params.id;
  //console.log("UPDATE: ", id)
  db.get("SELECT * FROM user WHERE userID=?", [id], function (error, theUser) {
    if (error) {
      console.log("ERROR: ", error);
      const model = {
        dbError: true,
        theError: error,
        user: {},
        isLoggedin: req.session.isLoggedin,
        isAdmin: req.session.isAdmin,
        name: req.session.name,
      };
      // renders the page with the model
      res.render("modifyusers.handlebars", model);
    } else {
      //console.log("MODIFY: ", JSON.stringify(theProject))
      //console.log("MODIFY: ", theProject)
      const model = {
        dbError: false,
        theError: "",
        user: theUser,
        isLoggedin: req.session.isLoggedin,
        isAdmin: req.session.isAdmin,
        name: req.session.name,
      };
      // renders the page with the model
      res.render("modifyusers.handlebars", model);
    }
  });
});

// modifies an existing project
app.post("/users/update/:id", (req, res) => {
  const id = req.params.id; // gets the ID from the dynamic parameter in the route
  const newUsers = [
    req.body.createUserName,
    req.body.createUserPassword, // The new plain text password
    req.body.firstName,
    req.body.lastName,
    req.body.userEmail,
    req.body.userRole,
    id,
  ];

  if (req.session.isLoggedin === true && req.session.isAdmin === true) {
    // Hash the new password
    bcrypt.hash(req.body.createUserPassword, saltRounds, function (err, hash) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Hashed password", hash);
        newUsers[1] = hash; // Update the array with the hashed password

        // Now, update the user record in the database with the new hashed password
        db.run(
          "UPDATE user SET createUserName=?, createUserPassword=?, firstName=?, lastName=?, userEmail=?, userRole=? WHERE userID=?",
          newUsers,
          (error) => {
            if (error) {
              console.log("ERROR: ", error);
            } else {
              console.log("User updated!");
            }
            res.redirect("/users");
          }
        );
      }
    });
  } else {
    res.redirect("/login");
  }
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
  notifier.notify({
    title: "Hello sir,",
    message: "You have been hacked, LOL",
  });
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
