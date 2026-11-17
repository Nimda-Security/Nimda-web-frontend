import React from 'react';
import NavBar from '@/components/Layout/Header/NavBar';
import Footer from '@/components/Layout/Footer';
import AdminSidebar from './AdminSidebar';
import { ConfirmHost } from './AdminUI';
import '../AdminDashboard.css';

/** 사이트 헤더 · "Manage" 사이드바 · 푸터로 감싼 관리자 페이지 틀 */
const AdminLayout = ({ activeSection, onSelect, pendingUsersCount, children }) => (
  <div className="layout">
    <NavBar />
    <div className="layout__body">
      <div className="adm">
        <AdminSidebar
          activeSection={activeSection}
          onSelect={onSelect}
          pendingUsersCount={pendingUsersCount}
        />
        <main className="adm-main">{children}</main>
      </div>
    </div>
    <Footer />
    <ConfirmHost />
  </div>
);

export default AdminLayout;
