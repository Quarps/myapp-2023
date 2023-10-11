//sqlstyle.guide

/*AUTHENTICATION
Use passport & localStrategy
passport.use(new LocalStrategy(...

isAuthenticated

Create a hash
const bcrypt = require(‘bcrypt’);
const hash = bcrypt.hashSync(password,10) 
*/

/*SESSIONS
const session = require(‘express-session’)

session express -> slides
*/

/*COOKIES
res.cookie(‘theme’, ‘dark’, {maxAge: 90000, httpOnly: true});
const cookieParser = require(‘cookie-parser’)
npm install cookie-parser
*/
