import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginScreen    from './screens/LoginScreen';
import SignInScreen   from './screens/SignInScreen';
import HomeScreen     from './screens/HomeScreen';
import PatientsScreen from './screens/PatientsScreen';
import ProfileScreen  from './screens/ProfileScreen';
import authService    from './services/authService';
// ✅ Import CSS sidebar au niveau racine pour garantir son chargement
import './components/css/sidebar.css';
import './App.css';

function getInitialPage() {
  if (!authService.isAuthenticated()) return 'login';
  const saved = sessionStorage.getItem('currentPage');
  const validPages = ['home', 'patients', 'profile'];
  return validPages.includes(saved) ? saved : 'home';
}

function App() {
  const [currentPage, setCurrentPage] = useState(getInitialPage);

  const navigation = {
    navigate: (page) => {
      let resolved = page;
      if      (page === '/login'    || page === 'Login')    resolved = 'login';
      else if (page === '/signin'   || page === 'SignIn')   resolved = 'signin';
      else if (page === '/home'     || page === 'Home')     resolved = 'home';
      else if (page === '/patients' || page === 'Patients') resolved = 'patients';
      else if (page === '/profile'  || page === 'Profile')  resolved = 'profile';

      if (resolved !== 'login' && resolved !== 'signin') {
        sessionStorage.setItem('currentPage', resolved);
      } else {
        sessionStorage.removeItem('currentPage');
      }

      setCurrentPage(resolved);
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