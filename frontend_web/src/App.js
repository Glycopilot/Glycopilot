import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginScreen    from './screens/LoginScreen';
import SignInScreen   from './screens/SignInScreen';
import HomeScreen     from './screens/HomeScreen';
import PatientsScreen from './screens/PatientsScreen';
import ProfileScreen  from './screens/ProfileScreen';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('login');

  const navigation = {
    navigate: (page) => {
      if      (page === '/login'    || page === 'Login')    setCurrentPage('login');
      else if (page === '/signin'   || page === 'SignIn')   setCurrentPage('signin');
      else if (page === '/home'     || page === 'Home')     setCurrentPage('home');
      else if (page === '/patients' || page === 'Patients') setCurrentPage('patients');
      else if (page === '/profile'  || page === 'Profile')  setCurrentPage('profile');
    }
  };

  return (
    <>
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
        {currentPage === 'login'    && <LoginScreen    navigation={navigation} />}
        {currentPage === 'signin'   && <SignInScreen   navigation={navigation} />}
        {currentPage === 'home'     && <HomeScreen     navigation={navigation} />}
        {currentPage === 'patients' && <PatientsScreen navigation={navigation} />}
        {currentPage === 'profile'  && <ProfileScreen  navigation={navigation} />}
      </div>
    </>
  );
}

export default App;