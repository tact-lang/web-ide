import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { WorkSpace } from './components/workspace';
import PageNotFound from './pages/404';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WorkSpace />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
