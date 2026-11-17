import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { cx } from './AdminUI';

/*
 * 메뉴 키는 기존 activeSection 값을 그대로 쓴다.
 * 예전 메뉴에서 합쳐진 화면은 aliases 로 같은 메뉴를 활성화한다.
 *   - 게시글 관리 = 포스트 수정/삭제(posts) + 게시글 고정(pin-post)
 *   - 카테고리   = 순서 설정(category-order) + 카테고리 수정(category-edit)
 *   - 태그       = 태그 관리(tag-management) + 태그별 게시글 비활성화(category-deactivate)
 */
export const ADMIN_MENU = [
  {
    title: '회원 관리',
    items: [
      { key: 'user-info', label: '유저 정보' },
      { key: 'pending', label: '가입 승인', countKey: 'pending' },
      { key: 'mileage', label: '마일리지 지급' },
    ],
  },
  {
    title: '콘텐츠 관리',
    items: [
      { key: 'posts', label: '게시글 관리', aliases: ['pin-post'] },
      { key: 'category-order', label: '카테고리', aliases: ['category-edit'] },
      { key: 'tag-management', label: '태그', aliases: ['category-deactivate'] },
    ],
  },
  {
    title: '커뮤니티 관리',
    items: [
      { key: 'groups', label: '스터디 그룹' },
      { key: 'profile-decorations', label: '프로필 배지' },
    ],
  },
];

/** 예전 섹션 키(다른 화면에서 state 로 넘어올 수 있음)를 새 메뉴 키로 바꾼다. */
export const normalizeSection = (section) => {
  for (const group of ADMIN_MENU) {
    for (const item of group.items) {
      if (item.key === section || item.aliases?.includes(section)) return item.key;
    }
  }
  return section;
};

const AdminSidebar = ({ activeSection, onSelect, pendingUsersCount = 0 }) => {
  const navigate = useNavigate();
  const active = normalizeSection(activeSection);
  const counts = { pending: pendingUsersCount };

  const handleClick = (key) => {
    if (onSelect) {
      onSelect(key);
    } else {
      // /admin/mileage 처럼 대시보드 밖의 관리자 페이지에서는 /admin 으로 이동
      navigate('/admin', { state: { section: key } });
    }
  };

  return (
    <aside className="adm-side">
      <h1 className="adm-side__title">
        <UserRound size={30} strokeWidth={2.4} fill="currentColor" />
        Manage
      </h1>

      <nav>
        {ADMIN_MENU.map((group) => (
          <div key={group.title} className="adm-side__group">
            <p className="adm-side__group-title">{group.title}</p>
            {group.items.map((item) => {
              const count = item.countKey ? counts[item.countKey] : 0;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={cx('adm-side__item', isActive && 'adm-side__item--active')}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleClick(item.key)}
                >
                  {item.label}
                  {count > 0 && <span className="adm-side__count">{count}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
