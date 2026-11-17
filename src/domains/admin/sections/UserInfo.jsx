import React, { useMemo, useState } from 'react';
import { Coins, RefreshCw, Search, UserCheck, Users, X } from 'lucide-react';
import {
  Avatar,
  Badge,
  Empty,
  Loading,
  PageHeader,
  Pagination,
  confirmDialog,
  cx,
  formatDateTime,
  usePaged,
} from '../components/AdminUI';

const ROLE_META = {
  ROLE_ADMIN: { label: '관리자', tone: 'pink' },
  ROLE_USER: { label: '회원', tone: undefined },
};

export const roleMeta = (role) => ROLE_META[role] || { label: role, tone: 'blue' };

const RoleBadges = ({ roles }) => (
  <div className="adm-badges">
    {roles.length === 0 ? (
      <span className="adm-help">없음</span>
    ) : (
      roles.map((role) => {
        const meta = roleMeta(role);
        return (
          <Badge key={role} tone={meta.tone}>
            {meta.label}
          </Badge>
        );
      })
    )}
  </div>
);

const PAGE_SIZE = 10;
const NO_ROLE = '__none__';

const UserInfo = ({
  users,
  loading,
  loadUsers,
  selectedUser,
  setSelectedUser,
  onSelectUser,
  getUserRoles,
  uploadingImage,
  handleImageUpload,
  availableRoles,
  grantingRole,
  handleGrantRole,
  removingRole,
  handleRemoveRole,
  pendingCount,
  onGoPending,
  onGoMileage,
}) => {
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleToGrant, setRoleToGrant] = useState('');

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return users.filter((user) => {
      const roles = getUserRoles(user);
      if (roleFilter === NO_ROLE && roles.length > 0) return false;
      if (roleFilter && roleFilter !== NO_ROLE && !roles.includes(roleFilter)) return false;
      if (!q) return true;
      return [user.nickname, user.userId, user.name, user.email, user.studentNum]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, keyword, roleFilter, getUserRoles]);

  const paged = usePaged(filtered, PAGE_SIZE, `${keyword}|${roleFilter}`);

  const selectedRoles = selectedUser ? getUserRoles(selectedUser) : [];
  const grantable = availableRoles.filter((role) => !selectedRoles.includes(role));

  const handleRemove = async (role) => {
    const ok = await confirmDialog({
      title: `${roleMeta(role).label} 권한을 제거할까요?`,
      message: `${selectedUser.nickname || selectedUser.userId} 님의 ${role} 권한이 제거됩니다.`,
      confirmText: '제거',
      danger: true,
    });
    if (ok) handleRemoveRole(selectedUser.id, role);
  };

  const handleGrant = async () => {
    await handleGrantRole(selectedUser.id, roleToGrant);
    setRoleToGrant('');
  };

  return (
    <>
      <PageHeader
        title="유저 정보"
        description="회원의 기본 정보와 권한을 확인하고 변경합니다."
        actions={
          <button type="button" className="adm-btn adm-btn--secondary" onClick={loadUsers} disabled={loading}>
            <RefreshCw size={15} />
            {loading ? '불러오는 중' : '새로고침'}
          </button>
        }
      />

      {pendingCount > 0 && (
        <div className="adm-alert">
          <UserCheck size={18} />
          가입 승인을 기다리는 회원이 {pendingCount}명 있습니다.
          <button type="button" className="adm-alert__action" onClick={onGoPending}>
            승인하러 가기 →
          </button>
        </div>
      )}

      <div className="adm-split">
        <div className="adm-split__main adm-card">
          <div className="adm-toolbar">
            <label className="adm-search">
              <Search size={16} />
              <input
                className="adm-input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="닉네임, 이름, 학번, 이메일로 검색"
              />
            </label>
            <select
              className="adm-select"
              style={{ width: 150 }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="권한으로 거르기"
            >
              <option value="">모든 권한</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {roleMeta(role).label} ({role})
                </option>
              ))}
              <option value={NO_ROLE}>권한 없음</option>
            </select>
          </div>

          {loading && users.length === 0 ? (
            <Loading />
          ) : users.length === 0 ? (
            <Empty
              icon={<Users size={22} />}
              title="사용자 목록이 비어 있습니다"
              action={
                <button type="button" className="adm-btn adm-btn--secondary" onClick={loadUsers}>
                  불러오기
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <Empty icon={<Search size={22} />} title="검색 결과가 없습니다">
              검색어나 권한 조건을 바꿔 보세요.
            </Empty>
          ) : (
            <>
              <div className="adm-table-scroll">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>회원</th>
                      <th>학번</th>
                      <th>권한</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.rows.map((user) => {
                      const isSelected = selectedUser?.id === user.id;
                      const display = user.nickname || user.userId;
                      return (
                        <tr
                          key={user.id}
                          className={cx('is-clickable', isSelected && 'is-selected')}
                          onClick={() => (onSelectUser ? onSelectUser(user) : setSelectedUser(user))}
                        >
                          <td>
                            <div className="adm-member">
                              <Avatar src={user.profileImage} name={user.name || display} tone={isSelected ? 'pink' : undefined} />
                              <div className="adm-member__text">
                                <p className="adm-member__name">{display}</p>
                                <p className="adm-member__sub">
                                  {[user.name, user.email].filter(Boolean).join(' · ') || user.userId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="is-num">{user.studentNum || '-'}</td>
                          <td>
                            <RoleBadges roles={getUserRoles(user)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="adm-tfoot">
                <span>
                  총 {filtered.length}명 중 {paged.from}–{paged.to}
                </span>
                <Pagination page={paged.page} pageCount={paged.pageCount} onChange={paged.setPage} />
              </div>
            </>
          )}
        </div>

        <aside className="adm-split__side adm-card">
          {selectedUser ? (
            <>
              <div className="adm-panel-sec">
                <div className="adm-profile">
                  <Avatar
                    src={selectedUser.profileImage}
                    name={selectedUser.name || selectedUser.nickname || selectedUser.userId}
                    size="lg"
                    tone="pink"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="adm-profile__name">{selectedUser.nickname || selectedUser.userId}</p>
                    <p className="adm-profile__sub">{selectedUser.name || '-'}</p>
                    <p className="adm-profile__sub">{selectedUser.email || '-'}</p>
                  </div>
                  <button type="button" className="adm-icon-btn" onClick={() => setSelectedUser(null)} aria-label="닫기">
                    <X size={18} />
                  </button>
                </div>
                <div className="adm-row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
                  <RoleBadges roles={selectedRoles} />
                  <input
                    type="file"
                    id="profile-image-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  <button
                    type="button"
                    className="adm-btn adm-btn--secondary adm-btn--sm"
                    disabled={uploadingImage}
                    onClick={() => document.getElementById('profile-image-input').click()}
                  >
                    {uploadingImage ? '업로드 중...' : '사진 추가'}
                  </button>
                </div>
              </div>

              <div className="adm-panel-sec">
                <p className="adm-panel-sec__title">기본 정보</p>
                <dl className="adm-kv">
                  <dt>실명</dt>
                  <dd>{selectedUser.name || '-'}</dd>
                  <dt>학번</dt>
                  <dd>{selectedUser.studentNum || '-'}</dd>
                  <dt>학과</dt>
                  <dd>{selectedUser.major || '-'}</dd>
                  <dt>생년월일</dt>
                  <dd>{selectedUser.birth || '-'}</dd>
                  <dt>사용자 ID</dt>
                  <dd>{selectedUser.userId || '-'}</dd>
                  <dt>번호</dt>
                  <dd>{selectedUser.id}</dd>
                  <dt>상태</dt>
                  <dd>{selectedUser.status || '-'}</dd>
                </dl>
              </div>

              <div className="adm-panel-sec">
                <p className="adm-panel-sec__title">가입 정보</p>
                <dl className="adm-kv">
                  <dt>가입일</dt>
                  <dd>{formatDateTime(selectedUser.createdAt)}</dd>
                  <dt>수정일</dt>
                  <dd>{formatDateTime(selectedUser.updatedAt)}</dd>
                </dl>
              </div>

              <div className="adm-panel-sec">
                <p className="adm-panel-sec__title">권한 관리</p>
                <div className="adm-stack">
                  {selectedRoles.map((role) => (
                    <div key={role} className="adm-role-row">
                      <Badge tone={roleMeta(role).tone}>{roleMeta(role).label}</Badge>
                      <span className="adm-spacer">{role}</span>
                      <button
                        type="button"
                        className="adm-btn adm-btn--danger adm-btn--sm"
                        disabled={removingRole}
                        onClick={() => handleRemove(role)}
                      >
                        제거
                      </button>
                    </div>
                  ))}
                  <div className="adm-row">
                    <select
                      className="adm-select"
                      value={roleToGrant}
                      onChange={(e) => setRoleToGrant(e.target.value)}
                      disabled={grantingRole || grantable.length === 0}
                      aria-label="부여할 권한"
                    >
                      <option value="">{grantable.length ? '부여할 권한 선택' : '부여할 권한 없음'}</option>
                      {grantable.map((role) => (
                        <option key={role} value={role}>
                          {roleMeta(role).label} ({role})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="adm-btn adm-btn--primary"
                      disabled={grantingRole || !roleToGrant}
                      onClick={handleGrant}
                    >
                      {grantingRole ? '부여 중' : '부여'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="adm-panel-foot">
                <button
                  type="button"
                  className="adm-btn adm-btn--secondary adm-btn--block"
                  onClick={() => onGoMileage(selectedUser.studentNum || selectedUser.userId)}
                >
                  <Coins size={15} />이 회원에게 마일리지 지급
                </button>
              </div>
            </>
          ) : (
            <Empty icon={<Users size={22} />} title="회원을 선택하세요">
              목록에서 회원을 누르면
              <br />
              상세 정보와 권한이 여기에 보입니다.
            </Empty>
          )}
        </aside>
      </div>
    </>
  );
};

export default UserInfo;
