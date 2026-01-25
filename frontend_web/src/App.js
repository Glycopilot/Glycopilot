import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginScreen from './screens/LoginScreen';
import SignInScreen from './screens/SignInScreen';
import HomeScreen from './screens/HomeScreen';
import AddPatient from './screens/AddPatient';
import './App.css';

// OPTION 1 : Navigation simple avec useState (SANS React Router)
function App() {
  const [currentPage, setCurrentPage] = useState('login'); // 'login', 'signin', ou 'home'

  // Objet navigation pour passer aux composants
  const navigation = {
    navigate: (page) => {
      // Gère les paths style React Router (/login, /signin, /home) ET les noms simples
      if (page === '/login' || page === 'Login') {
        setCurrentPage('login');
      } else if (page === '/signin' || page === 'SignIn') {
        setCurrentPage('signin');
      } else if (page === '/home' || page === 'Home') {
        setCurrentPage('home');
      } else if (page === '/add-patient' || page === 'AddPatient') {
        setCurrentPage('add-patient');
      }
    }
  };

  return (
    <>
      {/* Configuration des toasts - TRÈS IMPORTANT */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="App">
        {currentPage === 'login' && <LoginScreen navigation={navigation} />}
        {currentPage === 'signin' && <SignInScreen navigation={navigation} />}
        {currentPage === 'home' && <HomeScreen navigation={navigation} />}
        {currentPage === 'add-patient' && <AddPatient navigation={navigation} />}
      </div>
    </>
  );
}

export default App;