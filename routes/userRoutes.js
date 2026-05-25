const express = require("express");
const router = express.Router();
const Registration = require("../models/User");
const passport = require("passport");
const User = require("../models/User");
// loginpage
router.get("/login", (req, res) => {
  res.render("login");
});
// homepage
router.get("/", (req, res) => {
  res.render("index");
});


router.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.user.role === "admin") {
      res.redirect("/adminDash");
    } else if (req.user.role === "sales_attendant") {
      res.redirect("/salesDash");
    } else if (req.user.role === "stock_manager") {
      res.redirect("/stockDash");
    } else {
      res.redirect("/login");
    }
  },
);

// logoutpage

router.get('/logout', (req, res, next) =>{
  console.log("Logout request received...");
  req.logout( (err)=>{
    console.error("Logout error:", err);
    if(err) {

      return next(err);
    }
    req.session.destroy(() => {
        res.clearCookie('connect.sid'); // Clears the session cookie
        console.log("Session destroyed. Redirecting to login.");
        res.redirect('/'); 
    });
  
  })
})




// signuppage

router.get("/SignUpform", (req, res) => {
  res.render("SignUp");
});
router.post("/SignUp", async (req, res) => {
  try {
    const {
      fullName,
      email,
      ninNumber,
      role,
      ugPhoneNumber,
      userName,
      address,
      password,
    } = req.body;
    //   if user already exists
    let existingUser = await User.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return res.render("SignUp", { error: "Email is already registered" });
    }
    // const create new user
    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      ninNumber: ninNumber.toUpperCase(),
      address,
      ugPhoneNumber,
      role,
      userName,
      password,
    });
    console.log(newUser);
    console.log("Password:", req.body.password);
    await Registration.register(newUser, req.body.password, (err) => {
      if (err) {
        return res.redirect("/SignUp");
      }
    });
    res.redirect("/login");

    //  res.redirect('/login')
  } catch (error) {
    console.error(error);
  }
});

module.exports = router;