import React, { useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import {
  Avatar,
  Badge,
  Empty,
  Loading,
  PageHeader,
  confirmDialog,
  cx,
  formatDateTime,
} from '../components/AdminUI';

const waitingBadge = (createdAt) => {
  if (!createdAt) return null;
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  const days = Math.floor(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()) -
      new Date(start.getFullYear(), start.getMonth(), start.getDate())) /
      86400000
  );
  if (days <= 0) return <Badge>오늘</Badge>;
  return <Badge tone={days >= 3 ? 'red' : 'yellow'}>{days}일째</Badge>;
};

const PendingUsers = ({
  pendingUsers,
  pendingUsersLoading,
  loadPendingUsers,
  approveUsers,
  rejectUsers,
}) => {
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  // 목록이 바뀌면 사라진 사람은 선택에서 뺀다
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => pendingUsers.some((u) => u.id === id)));
  }, [pendingUsers]);

  const byId = useMemo(() => new Map(pendingUsers.map((u) => [u.id, u])), [pendingUsers]);
  const allChecked = pendingUsers.length > 0 && selected.length === pendingUsers.length;
  const nameOf = (id) => byId.get(id)?.nickname || byId.get(id)?.userId || id;

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const run = async (ids, kind) => {
    const names = ids.slice(0, 3).map(nameOf).join(', ') + (ids.length > 3 ? ` 외 ${ids.length - 3}명` : '');
    const approve = kind === 'approve';
    const ok = await confirmDialog(
      approve
        ? {
            title: ids.length > 1 ? `${ids.length}명의 가입을 승인할까요?` : '가입을 승인할까요?',
            message: `${names} 님에게 회원 권한이 부여됩니다.`,
            confirmText: '승인',
          }
        : {
            title: ids.length > 1 ? `${ids.length}명의 가입을 거부할까요?` : '가입을 거부할까요?',
            message: `${names} 님의 가입 신청이 거부됩니다.\n이 작업은 되돌릴 수 없습니다.`,
            confirmText: '거부하기',
            danger: true,
          }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await (approve ? approveUsers(ids) : rejectUsers(ids));
      setSelected([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="가입 승인"
        description="승인하면 회원 권한이 부여되고, 거부하면 가입 신청이 처리되지 않습니다."
        actions={
          <button
            type="button"
            className="adm-btn adm-btn--secondary"
            onClick={loadPendingUsers}
            disabled={pendingUsersLoading}
          >
            <RefreshCw size={15} />
            {pendingUsersLoading ? '불러오는 중' : '새로고침'}
          </button>
        }
      />

      <div className="adm-card">
        {pendingUsersLoading && pendingUsers.length === 0 ? (
          <Loading />
        ) : pendingUsers.length === 0 ? (
          <Empty icon={<Check size={22} />} iconTone="green" title="승인 대기 중인 회원이 없습니다">
            새 가입 신청이 들어오면 사이드바에 숫자로 알려드려요.
          </Empty>
        ) : (
          <>
            {selected.length > 0 && (
              <div className="adm-toolbar adm-toolbar--bulk">
                <span>{selected.length}명 선택됨</span>
                <span className="adm-spacer" />
                <button
                  type="button"
                  className="adm-btn adm-btn--danger"
                  disabled={busy}
                  onClick={() => run(selected, 'reject')}
                >
                  선택 거부
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn--primary"
                  disabled={busy}
                  onClick={() => run(selected, 'approve')}
                >
                  <Check size={15} />
                  선택 승인 ({selected.length})
                </button>
              </div>
            )}
            <div className="adm-table-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th className="is-check">
                      <input
                        type="checkbox"
                        className="adm-check"
                        checked={allChecked}
                        onChange={() => setSelected(allChecked ? [] : pendingUsers.map((u) => u.id))}
                        aria-label="모두 선택"
                      />
                    </th>
                    <th>회원</th>
                    <th>사용자 ID</th>
                    <th>신청일</th>
                    <th>대기</th>
                    <th className="is-right">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => {
                    const isSelected = selected.includes(user.id);
                    const display = user.nickname || user.userId;
                    return (
                      <tr key={user.id} className={cx(isSelected && 'is-selected')}>
                        <td className="is-check">
                          <input
                            type="checkbox"
                            className="adm-check"
                            checked={isSelected}
                            onChange={() => toggle(user.id)}
                            aria-label={`${display} 선택`}
                          />
                        </td>
                        <td>
                          <div className="adm-member">
                            <Avatar src={user.profileImage} name={user.name || display} />
                            <div className="adm-member__text">
                              <p className="adm-member__name">{display}</p>
                              <p className="adm-member__sub">{user.email || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="is-num">{user.userId}</td>
                        <td className="is-date">{formatDateTime(user.createdAt)}</td>
                        <td>{waitingBadge(user.createdAt)}</td>
                        <td>
                          <div className="adm-cell-actions">
                            <button
                              type="button"
                              className="adm-btn adm-btn--danger adm-btn--sm"
                              disabled={busy}
                              onClick={() => run([user.id], 'reject')}
                            >
                              거부
                            </button>
                            <button
                              type="button"
                              className="adm-btn adm-btn--primary adm-btn--sm"
                              disabled={busy}
                              onClick={() => run([user.id], 'approve')}
                            >
                              승인
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PendingUsers;
