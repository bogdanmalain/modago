// src/screens/SearchScreen.js
import React from "react";
import HomeScreen from "./HomeScreen";

export default function SearchScreen(props) {
  // Refolosim HomeScreen ca să nu duplicăm logică
  // props vin din Tab.Screen render (query/setQuery sunt transmise din AppNavigator)
  return <HomeScreen {...props} />;
}
