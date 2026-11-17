import React, { useState, useEffect } from 'react';
import { addVersionToHeaders } from '@/constants/version';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getAllUsersAPI,
  getAdminUserDetailAPI,
  getAvailableRolesAPI,
  getPendingUsersAPI,
  approveUserAPI,
  removeUserRoleAPI,
  rejectUserAPI,
  updateUserRoleAPI,
} from '@/api/admin/admin';
import { getBoardListAPI, deleteBoardAPI, toggleBoardPinAPI } from '@/api/board';
import {
  getAllCategoriesAdminAPI,
  updateCategoryAPI,
  createCategoryAPI,
  deleteCategoryAPI,
  updateCategorySortOrderAPI,
} from '@/api/category';
import { updatePointManualBulk } from '@/api/point';
import UserInfo from './sections/UserInfo';
import PendingUsers from './sections/PendingUsers';
import PostManagement from './sections/PostManagement';
import CategoryManagement from './sections/CategoryManagement';
import TagManagement from './sections/TagManagement';
import ProfileDecorationManagement from './sections/ProfileDecorationManagement';
import GroupManagement from './sections/GroupManagement';
import AdminLayout from './components/AdminLayout';
import { normalizeSection } from './components/AdminSidebar';
import { PageHeader } from './components/AdminUI';
import BulkMileagePaymentForm from './components/BulkMileagePaymentForm.jsx';

/** 마일리지 일괄 지급 요청 (AdminMileage 페이지와 같은 처리) */
export const grantMileageBulk = async (dataList) => {
  const requests = dataList.map(({ studentId, mileageAmount, reason }) => ({
    studentNum: studentId,
    description: reason,
    amount: Number(mileageAmount),
  }));
  const result = await updatePointManualBulk(requests);
  if (result.success) {
    alert(`[일괄 지급 성공]\n총 ${requests.length}명 지급 완료`);
  } else {
    alert(`[지급 실패]\n${result.message}`);
  }
};

export const MileageSection = ({ initialStudentId }) => (
  <>
    <PageHeader
      title="마일리지 지급"
      description="여러 회원에게 같은 금액과 사유로 한 번에 지급합니다. 정확한 학번인지 다시 한번 확인해 주세요."
    />
    <BulkMileagePaymentForm onGrant={grantMileageBulk} initialStudentId={initialStudentId} />
  </>
);

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('user-info');
  const [mileageStudentId, setMileageStudentId] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [grantingRole, setGrantingRole] = useState(false);
  const [removingRole, setRemovingRole] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingUsersLoading, setPendingUsersLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedPostCategoryId, setSelectedPostCategoryId] = useState(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState(null);
  const [newCategoryRedirectUrl, setNewCategoryRedirectUrl] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryRedirectUrl, setCategoryRedirectUrl] = useState(''); // 선택된 카테고리의 바로가기 URL

  // 카테고리 순서 드래그앤드롭 상태
  const [localCategoryTree, setLocalCategoryTree] = useState([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  // 다른 페이지에서 관리자 화면으로 넘어올 때 넘겨준 섹션 처리
  useEffect(() => {
    if (location.state) {
      if (location.state.section) setActiveSection(normalizeSection(location.state.section));
      if (location.state.studentId) setMileageStudentId(String(location.state.studentId));
      // 상태 사용 후 초기화 (뒤로가기 시 중복 처리 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const goToSection = (section) => {
    setActiveSection(section);
    window.scrollTo({ top: 0 });
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getAllUsersAPI();
      if (result.success) {
        setUsers(result.users || []);
      } else {
        alert('사용자 목록을 불러오는데 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error);
      alert('사용자 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    // 목록에서 선택한 유저 정보를 즉시 표시하고, 이후 상세 조회(presigned profileImage 포함)로 갱신
    setSelectedUser(user);
    try {
      const result = await getAdminUserDetailAPI(user.id);
      if (result.success && result.user) {
        setSelectedUser(result.user);
      }
    } catch (error) {
      console.error('사용자 상세 정보 로드 오류:', error);
    }
  };

  const loadAvailableRoles = async () => {
    try {
      const result = await getAvailableRolesAPI();
      if (result.success) {
        setAvailableRoles(result.roles || []);
      } else {
        alert('권한 목록을 불러오는데 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('권한 목록 로드 오류:', error);
      alert('권한 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const loadPosts = async (categorySlug = null) => {
    setPostsLoading(true);
    try {
      const slug = categorySlug || 'news';
      const result = await getBoardListAPI({ slug, page: 0, size: 100 });
      if (result.success) {
        setPosts(result.posts || []);
      } else {
        alert('게시글 목록을 불러오는데 실패했습니다: ' + result.message);
        setPosts([]);
      }
    } catch (error) {
      console.error('게시글 목록 로드 오류:', error);
      alert('게시글 목록을 불러오는 중 오류가 발생했습니다.');
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadPendingUsers = async ({ silent = false } = {}) => {
    setPendingUsersLoading(true);
    try {
      const result = await getPendingUsersAPI();
      if (result.success) {
        setPendingUsers(result.users || []);
      } else if (!silent) {
        alert('승인 대기 사용자 목록을 불러오는데 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('승인 대기 사용자 목록 로드 오류:', error);
      if (!silent) alert('승인 대기 사용자 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setPendingUsersLoading(false);
    }
  };

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const allCategories = await getAllCategoriesAdminAPI();
      setCategories(allCategories);
    } catch (error) {
      console.error('카테고리 목록 로드 오류:', error);
      const errorMessage =
        error instanceof Error ? error.message : '카테고리 목록을 불러오는 중 오류가 발생했습니다.';
      alert(errorMessage);
      setCategories([]); // 에러 발생 시 빈 배열로 설정
    } finally {
      setCategoriesLoading(false);
    }
  };

  const resetAddCategoryForm = () => {
    setShowAddCategoryModal(false);
    setNewCategoryName('');
    setNewCategorySlug('');
    setNewCategoryParentId(null);
    setNewCategoryRedirectUrl('');
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('카테고리명을 입력해주세요.');
      return;
    }
    if (!newCategorySlug.trim()) {
      alert('슬러그를 입력해주세요.');
      return;
    }

    // 슬러그 유효성 검사 (영문자, 숫자, 하이픈만 허용)
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(newCategorySlug)) {
      alert('슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.');
      return;
    }

    setAddingCategory(true);
    try {
      const result = await createCategoryAPI({
        name: newCategoryName.trim(),
        slug: newCategorySlug.trim(),
        parentId: newCategoryParentId || null,
        sortOrder: 0,
        isActive: true,
        redirectUrl: newCategoryRedirectUrl.trim() || null,
      });

      if (result.success) {
        alert('카테고리가 성공적으로 추가되었습니다.');
        resetAddCategoryForm();
        // 백엔드 처리 시간 고려
        setTimeout(() => {
          loadCategories();
        }, 300);
      } else {
        alert(result.message || '카테고리 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('카테고리 추가 오류:', error);
      alert('카테고리 추가 중 오류가 발생했습니다.');
    } finally {
      setAddingCategory(false);
    }
  };

  // 확인은 화면(CategoryManagement)에서 받는다
  const handleToggleCategoryActive = async (category) => {
    const nextActive = !category.isActive;
    const action = nextActive ? '표시' : '숨김';
    try {
      const result = await updateCategoryAPI(category.id, {
        name: category.name,
        slug: category.slug,
        parentId: category.parentId || null,
        sortOrder: category.sortOrder,
        isActive: nextActive,
      });
      if (result.success) {
        loadCategories();
      } else {
        alert(result.message || `${action} 처리에 실패했습니다.`);
      }
    } catch (error) {
      console.error('카테고리 활성화 토글 오류:', error);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  // 확인은 화면(CategoryManagement)에서 받는다
  const handleDeleteCategory = async () => {
    if (!selectedCategoryId) return;
    try {
      const result = await deleteCategoryAPI(selectedCategoryId);
      if (result.success) {
        alert('카테고리가 성공적으로 삭제되었습니다.');
        setSelectedCategoryId(null); // 선택 해제
        // 약간의 지연 후 목록 새로고침
        setTimeout(() => {
          loadCategories();
        }, 300);
      } else {
        alert(result.message || '카테고리 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('카테고리 삭제 오류:', error);
      alert('카테고리 삭제 중 오류가 발생했습니다.');
    }
  };

  /** 여러 명을 차례로 승인/거부하고 결과를 한 번에 알린다. 확인은 화면(PendingUsers)에서 받는다. */
  const runForUsers = async (ids, apiFn, verb) => {
    const failures = [];
    for (const id of ids) {
      try {
        const result = await apiFn(id);
        if (!result.success) failures.push(result.message || `${id}번 사용자 ${verb} 실패`);
      } catch (error) {
        console.error(`사용자 ${verb} 오류:`, error);
        failures.push(`${id}번 사용자 ${verb} 중 오류`);
      }
    }
    const done = ids.length - failures.length;
    if (failures.length === 0) {
      alert(ids.length > 1 ? `${done}명을 ${verb}했습니다.` : `사용자를 ${verb}했습니다.`);
    } else {
      alert(`${done}명 ${verb}, ${failures.length}명 실패\n\n${failures.join('\n')}`);
    }
    loadPendingUsers();
    loadUsers();
  };

  const approveUsers = (ids) => runForUsers(ids, approveUserAPI, '승인');
  const rejectUsers = (ids) => runForUsers(ids, rejectUserAPI, '거부');

  const reloadSelectedPosts = () => {
    const selectedCategory = selectedPostCategoryId
      ? findCategoryById(activeCategoryTree, selectedPostCategoryId)
      : null;
    loadPosts(selectedCategory ? selectedCategory.slug : null);
  };

  // 확인은 화면(PostManagement)에서 받는다
  const handleDeletePost = async (postId) => {
    try {
      const result = await deleteBoardAPI(postId);
      if (result.success) {
        alert('게시글이 삭제되었습니다.');
        reloadSelectedPosts();
      } else {
        alert(result.message || '게시글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      alert('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditPost = (post) => {
    const slug = post.category?.slug || 'news';
    navigate(`/board/${slug}/edit/${post.id}`);
  };

  const handleTogglePin = async (postId) => {
    try {
      const result = await toggleBoardPinAPI(postId);
      if (result.success) {
        // 고정 표시가 바로 바뀌므로 성공 알림은 띄우지 않는다
        reloadSelectedPosts();
      } else {
        alert(result.message || '게시글 고정/해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 고정/해제 오류:', error);
      alert('게시글 고정/해제 중 오류가 발생했습니다.');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setUploadingImage(true);
    try {
      const presignedResponse = await fetch(`/api/users/me/profile-image/presigned-url`, {
        method: 'POST',
        headers: addVersionToHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });

      const presignedResult = await presignedResponse.json();

      if (!presignedResponse.ok || !presignedResult.success) {
        alert(presignedResult.message || 'Presigned URL 생성에 실패했습니다.');
        return;
      }

      const s3UploadResponse = await fetch(presignedResult.presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!s3UploadResponse.ok) {
        alert('S3 업로드에 실패했습니다.');
        return;
      }

      const dbUpdateResponse = await fetch(`/api/users/me/profile-image`, {
        method: 'PUT',
        headers: addVersionToHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({
          imageUrl: presignedResult.imageUrl,
        }),
      });

      const dbUpdateResult = await dbUpdateResponse.json();

      if (dbUpdateResponse.ok && dbUpdateResult.success) {
        setSelectedUser({
          ...selectedUser,
          profileImage: dbUpdateResult.profileImage,
        });
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id ? { ...u, profileImage: dbUpdateResult.profileImage } : u
          )
        );
        alert('프로필 이미지가 업데이트되었습니다.');
      } else {
        alert(dbUpdateResult.message || '프로필 이미지 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleGrantRole = async (userId, role) => {
    if (!role) {
      alert('부여할 권한을 선택해주세요.');
      return;
    }

    setGrantingRole(true);
    try {
      const result = await updateUserRoleAPI(userId, role);
      if (result.success) {
        alert(result.message || '권한이 부여되었습니다.');
        await loadUsers();

        if (selectedUser && selectedUser.id === userId) {
          const nextRoles = (result.roles || []).map((r) =>
            typeof r === 'string' ? { authorityName: r } : r
          );
          setSelectedUser((prev) => (prev ? { ...prev, authorities: nextRoles } : prev));
        }
      } else {
        alert(result.message || '권한 부여에 실패했습니다.');
      }
    } catch (error) {
      console.error('권한 부여 오류:', error);
      alert('권한 부여 중 오류가 발생했습니다.');
    } finally {
      setGrantingRole(false);
    }
  };

  const handleRemoveRole = async (userId, role) => {
    if (!role) {
      alert('제거할 권한을 선택해주세요.');
      return;
    }

    setRemovingRole(true);
    try {
      const result = await removeUserRoleAPI(userId, role);
      if (result.success) {
        alert(result.message || '권한이 제거되었습니다.');
        await loadUsers();

        if (selectedUser && selectedUser.id === userId) {
          const nextRoles = (result.roles || []).map((r) =>
            typeof r === 'string' ? { authorityName: r } : r
          );
          setSelectedUser((prev) => (prev ? { ...prev, authorities: nextRoles } : prev));
        }
      } else {
        alert(result.message || '권한 제거에 실패했습니다.');
      }
    } catch (error) {
      console.error('권한 제거 오류:', error);
      alert('권한 제거 중 오류가 발생했습니다.');
    } finally {
      setRemovingRole(false);
    }
  };

  // 카테고리를 트리 구조로 변환
  const buildCategoryTree = (list) => {
    const categoryMap = new Map();
    const rootCategories = [];

    list.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    list.forEach((cat) => {
      const category = categoryMap.get(cat.id);
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId).children.push(category);
      } else if (category) {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  };

  // active 카테고리만 필터링
  const filterActiveCategories = (tree) =>
    tree
      .filter((item) => item.isActive !== false)
      .map((item) => ({
        ...item,
        children: item.children && item.children.length > 0 ? filterActiveCategories(item.children) : [],
      }));

  const categoryTree = buildCategoryTree(categories);
  const activeCategoryTree = filterActiveCategories(categoryTree);

  // 선택된 카테고리 찾기
  function findCategoryById(tree, id) {
    for (const cat of tree) {
      if (cat.id === id) return cat;
      if (cat.children && cat.children.length > 0) {
        const found = findCategoryById(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const selectedCategoryData = selectedCategoryId ? findCategoryById(categoryTree, selectedCategoryId) : null;

  // 모든 카테고리를 평탄화 (부모 선택용)
  const flattenCategories = (tree, level = 0) => {
    const result = [];
    tree.forEach((category) => {
      result.push({ ...category, level });
      if (category.children && category.children.length > 0) {
        result.push(...flattenCategories(category.children, level + 1));
      }
    });
    return result;
  };

  const allCategoriesFlat = flattenCategories(activeCategoryTree);

  // 드래그앤드롭으로 카테고리 순서 변경 (같은 부모 안에서만)
  const handleCategoryDrop = (draggedId, targetId) => {
    const findParentId = (nodes, id, parentId = null) => {
      for (const node of nodes) {
        if (node.id === id) return parentId;
        if (node.children && node.children.length > 0) {
          const result = findParentId(node.children, id, node.id);
          if (result !== undefined) return result;
        }
      }
      return undefined;
    };

    const getSiblings = (nodes, parentId) => {
      if (parentId === null) return nodes;
      for (const node of nodes) {
        if (node.id === parentId) return node.children;
        if (node.children && node.children.length > 0) {
          const result = getSiblings(node.children, parentId);
          if (result) return result;
        }
      }
      return null;
    };

    const newTree = JSON.parse(JSON.stringify(localCategoryTree));
    const draggedParentId = findParentId(newTree, draggedId);
    const targetParentId = findParentId(newTree, targetId);

    // 같은 부모 레벨 내에서만 순서 변경 허용
    if (draggedParentId !== targetParentId) return;

    const siblings = getSiblings(newTree, draggedParentId);
    if (!siblings) return;

    const draggedIdx = siblings.findIndex((n) => n.id === draggedId);
    const targetIdx = siblings.findIndex((n) => n.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const [removed] = siblings.splice(draggedIdx, 1);
    siblings.splice(targetIdx, 0, removed);

    setLocalCategoryTree(newTree);
    setOrderChanged(true);
  };

  // 카테고리 순서 저장
  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const sortOrders = [];
      const flattenForOrder = (nodes) => {
        nodes.forEach((node, idx) => {
          sortOrders.push({ id: node.id, sortOrder: idx });
          if (node.children && node.children.length > 0) {
            flattenForOrder(node.children);
          }
        });
      };
      flattenForOrder(localCategoryTree);

      const result = await updateCategorySortOrderAPI(sortOrders);
      if (result.success) {
        alert('카테고리 순서가 저장되었습니다.');
        setOrderChanged(false);
        await loadCategories();
      } else {
        alert(result.message || '순서 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('순서 저장 오류:', error);
      alert('순서 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingOrder(false);
    }
  };

  // 처음 들어오면 승인 대기 수를 불러와 사이드바·알림에 보여준다
  useEffect(() => {
    loadPendingUsers({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeSection === 'pending') {
      loadPendingUsers();
    } else if (activeSection === 'category-order' || activeSection === 'tag-management') {
      loadCategories();
    } else if (activeSection === 'posts') {
      // 게시글 관리: 카테고리 목록 로드 (게시글은 카테고리 선택 시 로드)
      if (categories.length === 0) {
        loadCategories();
      }
    } else if (activeSection === 'user-info') {
      loadUsers();
      loadAvailableRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // 선택된 카테고리가 바뀌면 바로가기 URL 입력값을 맞춘다
  useEffect(() => {
    setCategoryRedirectUrl(selectedCategoryData?.redirectUrl || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  // categoryTree가 변경되면 localCategoryTree 동기화
  useEffect(() => {
    setLocalCategoryTree(JSON.parse(JSON.stringify(buildCategoryTree(categories))));
    setOrderChanged(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const getUserRoles = (user) => {
    if (user?.authorities && user.authorities.length > 0) {
      return user.authorities.map((auth) => auth.authorityName || auth);
    }
    if (user?.roles && user.roles.length > 0) {
      return user.roles.map((role) => role.authorityName || role);
    }
    return [];
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'user-info':
        return (
          <UserInfo
            users={users}
            loading={loading}
            loadUsers={loadUsers}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            onSelectUser={handleSelectUser}
            getUserRoles={getUserRoles}
            uploadingImage={uploadingImage}
            handleImageUpload={handleImageUpload}
            availableRoles={availableRoles}
            grantingRole={grantingRole}
            handleGrantRole={handleGrantRole}
            removingRole={removingRole}
            handleRemoveRole={handleRemoveRole}
            pendingCount={pendingUsers.length}
            onGoPending={() => goToSection('pending')}
            onGoMileage={(studentId) => {
              setMileageStudentId(String(studentId || ''));
              goToSection('mileage');
            }}
          />
        );
      case 'pending':
        return (
          <PendingUsers
            pendingUsers={pendingUsers}
            pendingUsersLoading={pendingUsersLoading}
            loadPendingUsers={() => loadPendingUsers()}
            approveUsers={approveUsers}
            rejectUsers={rejectUsers}
          />
        );
      case 'posts':
        return (
          <PostManagement
            categoriesLoading={categoriesLoading}
            activeCategoryTree={activeCategoryTree}
            loadCategories={loadCategories}
            selectedPostCategoryId={selectedPostCategoryId}
            setSelectedPostCategoryId={setSelectedPostCategoryId}
            loadPosts={loadPosts}
            postsLoading={postsLoading}
            posts={posts}
            handleDeletePost={handleDeletePost}
            handleTogglePin={handleTogglePin}
            handleEditPost={handleEditPost}
          />
        );
      case 'category-order':
        return (
          <CategoryManagement
            setShowAddCategoryModal={setShowAddCategoryModal}
            handleDeleteCategory={handleDeleteCategory}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            categoryTree={categoryTree}
            categoriesLoading={categoriesLoading}
            loadCategories={loadCategories}
            selectedCategoryData={selectedCategoryData}
            updateCategoryAPI={updateCategoryAPI}
            categoryRedirectUrl={categoryRedirectUrl}
            setCategoryRedirectUrl={setCategoryRedirectUrl}
            localCategoryTree={localCategoryTree}
            handleCategoryDrop={handleCategoryDrop}
            handleToggleCategoryActive={handleToggleCategoryActive}
            handleSaveOrder={handleSaveOrder}
            savingOrder={savingOrder}
            orderChanged={orderChanged}
          />
        );
      case 'tag-management':
        return (
          <TagManagement
            categoryTree={categoryTree}
            categoriesLoading={categoriesLoading}
            loadCategories={loadCategories}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
          />
        );
      case 'mileage':
        return <MileageSection initialStudentId={mileageStudentId} />;
      case 'profile-decorations':
        return <ProfileDecorationManagement />;
      case 'groups':
        return <GroupManagement />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout activeSection={activeSection} onSelect={goToSection} pendingUsersCount={pendingUsers.length}>
      {renderContent()}

      {/* 카테고리 추가 모달 */}
      {showAddCategoryModal && (
        <div className="adm-modal-overlay" onClick={resetAddCategoryForm}>
          <div className="adm-modal adm-modal--wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal__head">
              <p className="adm-modal__title">카테고리 추가</p>
              <button type="button" className="adm-icon-btn" onClick={resetAddCategoryForm} aria-label="닫기">
                ✕
              </button>
            </div>

            <div className="adm-form">
              <label className="adm-field">
                <span className="adm-label">카테고리명 *</span>
                <input
                  className="adm-input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="예: 공지사항"
                  autoFocus
                />
              </label>

              <label className="adm-field">
                <span className="adm-label">슬러그 (URL) *</span>
                <input
                  className="adm-input"
                  value={newCategorySlug}
                  onChange={(e) => setNewCategorySlug(e.target.value)}
                  placeholder="예: notice"
                />
                <span className="adm-help">영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.</span>
              </label>

              <label className="adm-field">
                <span className="adm-label">상위 카테고리</span>
                <select
                  className="adm-select"
                  value={newCategoryParentId || ''}
                  onChange={(e) => setNewCategoryParentId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">최상위 카테고리</option>
                  {allCategoriesFlat.map((category) => {
                    const isChild = category.level > 0;
                    return (
                      <option
                        key={category.id}
                        value={category.id}
                        disabled={isChild} // 2단계 카테고리는 부모로 선택 불가
                      >
                        {'  '.repeat(category.level)}
                        {category.name}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="adm-field">
                <span className="adm-label">바로가기 URL (선택)</span>
                <input
                  type="url"
                  className="adm-input"
                  value={newCategoryRedirectUrl}
                  onChange={(e) => setNewCategoryRedirectUrl(e.target.value)}
                  placeholder="예: https://example.com"
                />
                <span className="adm-help">입력하면 클릭 시 해당 URL로 바로 이동합니다. 게시판으로 사용하려면 비워두세요.</span>
              </label>
            </div>

            <div className="adm-modal__actions">
              <button type="button" className="adm-btn adm-btn--secondary" onClick={resetAddCategoryForm} disabled={addingCategory}>
                취소
              </button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={handleAddCategory} disabled={addingCategory}>
                {addingCategory ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminDashboard;
