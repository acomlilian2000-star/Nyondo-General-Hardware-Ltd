const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require("passport");

// 🏠 Homepage
router.get('/', (req, res) => {
  res.render('index');
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
      res.redirect("/StockDash");
    } else {
      res.redirect("/login");
    }
  },
);



// 🚪 Login GET
router.get("/login", (req, res) => {
  res.render("login");
});

// 🛡️ Secure Account GET (FIXED)
// router.get('/secureAcc', (req, res) => {

  // if (!req.isAuthenticated()) {
  //   return res.redirect("/login");
  // }

//   return res.render("secureAcc");
// });


// 🛡️ Secure Account POST (ONLY ONE - FIXED)
// router.post("/secureAcc", async (req, res) => {

//   try {

//     const user = await User.findById(req.user._id);

//     // mark first login completed
//     user.isFirstLogin = false;

//     await user.save();

//     console.log("UPDATED SUCCESSFULLY");

//     // role redirect
//     // if (user.role === "admin") {
//     //   return res.redirect("/Dashboard");
//     // }

//     // if (user.role === "sales_attendant") {
//     //   return res.redirect("/salesDash");
//     // }

//     // if (user.role === "stock_manager") {
//     //   return res.redirect("/StockDash");
//     // }

//     return res.redirect("/login");

//   } catch (error) {
//     console.log(error);
//     return res.redirect("/secureAcc");
//   }
// });


// 🔑 Login POST (FIXED SAFER LOGIC)
// router.post("/login", (req, res, next) => {

//   console.log("BODY:", req.body);

//   passport.authenticate("local", (err, user, info) => {

//     console.log("USER:", user);

//     if (err) return next(err);

//     if (!user) {
//       console.log("AUTH FAILED");
//       return res.redirect("/login");
//     }

//     req.logIn(user, (err) => {

//       if (err) return next(err);

//       console.log("LOGIN SUCCESS");
//       console.log("FIRST LOGIN:", user.isFirstLogin);

//       // FIRST LOGIN CHECK (FIXED)
//       if (user.isFirstLogin !== false) {
//         console.log("Redirecting to secureAcc");
//         return res.redirect("/secureAcc");
//       }

//       // ROLE ROUTING
//       if (user.role === "admin") {
//         return res.redirect("/Dashboard");
//       }

//       if (user.role === "sales_attendant") {
//         return res.redirect("/salesDash");
//       }

//       if (user.role === "stock_manager") {
//         return res.redirect("/StockDash");
//       }

//       return res.redirect("/");

//     });

//   })(req, res, next);
// });


// 📝 Signup GET
router.get('/SignUpform', (req, res) => {
  res.render('SignUp');
});


// 📝 Signup POST (FIXED PROMISE STYLE)
router.post("/SignUp", async (req, res) => {

  try {

    const {
      fullName,
      email,
      ninNumber,
      role,
      phoneNumber,
      password,
      address
    } = req.body;

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.render("SignUp", {
        error: "Email already exists"
      });
    }

    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      ninNumber: ninNumber.toUpperCase(),
      role,
      phoneNumber,
      address,
      isFirstLogin: true
    });

    await User.register(newUser, password);

    console.log("USER REGISTERED SUCCESSFULLY");

    return res.redirect("/login");

  } catch (error) {
    console.log(error);
    return res.status(500).send("Registration Failed");
  }

});


// 🚪 Logout
router.get('/logout', (req, res, next) => {

  req.logout((err) => {

    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });

  });

});

module.exports = router;