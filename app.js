const express = require("express"); // loads the express package
const { engine } = require("express-handlebars"); // loads handlebars for Express
const port = 8050; // defines the port
const app = express(); // creates the Express application

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

// CONTROLLER (THE BOSS)
// defines route "/"
app.get("/", function (request, response) {
  response.render("home.handlebars");
});

// defines route "/about"
app.get("/about", function (request, response) {
  const model = { listProjects: projects };
  response.render("about.handlebars", model);
});

// defines route "/contact"
app.get("/contact", function (request, response) {
  const model = projects[1];
  response.render("contact.handlebars", model);
});

// defines route "/login"
app.get("/login", function (request, response) {
  const model = projects[1];
  response.render("login.handlebars", model);
});

//define route "/about/id"
app.get("/about/:id", function (request, response) {
  const id = request.params.id;
  const model = projects[id];
  response.render("project.handlebars", model);
});

// defines the final default route 404 NOT FOUND
app.use(function (req, res) {
  res.status(404).render("404.handlebars");
});

// runs the app and listens to the port
app.listen(port, () => {
  console.log(`Server running and listening on port ${port}...`);
});
