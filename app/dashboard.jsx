// Alias for /dashboard route to prevent "page not found"
// Some old code pushes to /dashboard but file is home.jsx
// This wrapper ensures both /home and /dashboard work
import HomeScreen from './home';
export default HomeScreen;
