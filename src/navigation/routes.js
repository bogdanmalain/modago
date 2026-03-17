// src/navigation/routes.js
// CE ESTE:
// - lista centrală de rute a aplicației
//
// MODIFICĂRI:
// - păstrate rutele pentru EditProfile, Balance, Orders, VacationMode
// - eliminată ruta PendingBalanceInfo; info pentru sold rămâne local în BalanceScreen

export const ROUTES = {
  Home: "Home",
  Search: "Search",
  AddItem: "AddItem",
  Inbox: "Inbox",
  Profile: "Profile",

  Tabs: "Tabs",

  ItemDetails: "ItemDetails",
  EditItem: "EditItem",
  EditProfile: "EditProfile",

  // Auth
  Welcome: "Welcome",
  Login: "Login",
  Register: "Register",
  ForgotPassword: "ForgotPassword",
  ResetPassword: "ResetPassword",

  MyItems: "MyItems",
  Favorites: "Favorites",

  ImageViewer: "ImageViewer",

  ThemeSettings: "ThemeSettings",

  Balance: "Balance",
  Orders: "Orders",
  VacationMode: "VacationMode",
};