import { useLocation } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import { MileageSection } from './AdminDashboard.jsx';

/** /admin/mileage — 다른 화면에서 학번을 넘겨받아 바로 지급할 때 쓰는 페이지 */
function AdminMileage() {
  const location = useLocation();
  const initialStudentId = location.state?.studentId || '';

  return (
    <AdminLayout activeSection="mileage">
      <MileageSection initialStudentId={initialStudentId} />
    </AdminLayout>
  );
}

export default AdminMileage;
