import React, { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import {
  createGroupAPI,
  deleteGroupAPI,
  getAllGroupsAPI,
  getGroupDetailAPI,
} from '@/api/admin/admin';
import { Empty, Loading, PageHeader, confirmDialog, cx } from '../components/AdminUI';

const MAX_CAPACITY = 15;
const MAX_DESCRIPTION = 200;

const GroupManagement = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('5');
  const [description, setDescription] = useState('');
  // 펼친 그룹의 멤버. { [groupId]: { loading, members, message } }
  const [expanded, setExpanded] = useState({});

  const loadGroups = async (search = keyword) => {
    setLoading(true);
    const result = await getAllGroupsAPI(search);
    if (result.success) {
      setGroups(result.groups);
    } else {
      alert(result.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadGroups('');
    // 처음 한 번만 전체 목록을 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    setExpanded({});
    void loadGroups(keyword);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const capacityNumber = Number(capacity);
    if (!trimmedName) {
      alert('그룹 이름을 입력해주세요.');
      return;
    }
    if (!Number.isInteger(capacityNumber) || capacityNumber < 1 || capacityNumber > MAX_CAPACITY) {
      alert(`최대 인원은 1~${MAX_CAPACITY}명 사이로 입력해주세요.`);
      return;
    }

    setSaving(true);
    try {
      const result = await createGroupAPI({
        name: trimmedName,
        capacity: capacityNumber,
        description: description.trim() || null,
      });
      alert(result.message);
      if (!result.success) return;

      setName('');
      setCapacity('5');
      setDescription('');
      await loadGroups();
    } finally {
      setSaving(false);
    }
  };

  const toggleMembers = async (groupId) => {
    if (expanded[groupId]) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      return;
    }
    setExpanded((prev) => ({ ...prev, [groupId]: { loading: true, members: [] } }));
    const result = await getGroupDetailAPI(groupId);
    setExpanded((prev) => ({
      ...prev,
      [groupId]: result.success
        ? { loading: false, members: result.group?.members ?? [] }
        : { loading: false, members: [], message: result.message },
    }));
  };

  const handleDelete = async (group) => {
    const ok = await confirmDialog({
      title: `"${group.name}" 그룹을 삭제할까요?`,
      message: '멤버 정보도 함께 삭제되며 되돌릴 수 없습니다.',
      confirmText: '삭제',
      danger: true,
    });
    if (!ok) return;
    setDeletingId(group.id);
    try {
      const result = await deleteGroupAPI(group.id);
      alert(result.message);
      if (!result.success) return;
      setGroups((prev) => prev.filter((item) => item.id !== group.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PageHeader title="스터디 그룹" description="스터디 그룹을 만들고 멤버를 확인합니다." />

      <form onSubmit={handleCreate} className="adm-card">
        <div className="adm-card__body adm-form">
          <div>
            <p className="adm-card__title">그룹 만들기</p>
            <p className="adm-card__desc">그룹을 만든 관리자가 그룹장이 됩니다. 수정·삭제는 그룹장만 할 수 있습니다.</p>
          </div>
          <div className="adm-grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <label className="adm-field">
              <span className="adm-label">그룹 이름</span>
              <input
                type="text"
                value={name}
                maxLength={50}
                onChange={(event) => setName(event.target.value)}
                className="adm-input"
                placeholder="예: 웹 해킹 스터디"
              />
            </label>
            <label className="adm-field">
              <span className="adm-label">최대 인원 (1~{MAX_CAPACITY})</span>
              <input
                type="number"
                min={1}
                max={MAX_CAPACITY}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                className="adm-input"
              />
            </label>
            <label className="adm-field adm-span-2">
              <span className="adm-label">
                설명 ({description.length}/{MAX_DESCRIPTION})
              </span>
              <input
                type="text"
                value={description}
                maxLength={MAX_DESCRIPTION}
                onChange={(event) => setDescription(event.target.value)}
                className="adm-input"
                placeholder="선택 입력"
              />
            </label>
          </div>
          <div className="adm-form__actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? '생성 중...' : '그룹 생성'}
            </button>
          </div>
        </div>
      </form>

      <div className="adm-card">
        <form onSubmit={handleSearch} className="adm-toolbar">
          <label className="adm-search">
            <Search size={16} />
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="adm-input"
              placeholder="그룹 이름으로 검색"
            />
          </label>
          <button type="submit" className="adm-btn adm-btn--secondary">
            검색
          </button>
        </form>

        {loading ? (
          <Loading />
        ) : groups.length === 0 ? (
          <Empty icon={<BookOpen size={22} />} title={keyword.trim() ? '검색 결과가 없습니다' : '등록된 그룹이 없습니다'} />
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>인원</th>
                  <th>설명</th>
                  <th className="is-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const detail = expanded[group.id];
                  return (
                    <React.Fragment key={group.id}>
                      <tr className={cx(detail && 'is-selected')}>
                        <td style={{ fontWeight: 700 }}>{group.name}</td>
                        <td className="is-num">
                          {group.currentMemberCount}/{group.capacity}
                        </td>
                        <td style={{ color: 'var(--adm-sub)' }}>{group.description || '-'}</td>
                        <td>
                          <div className="adm-cell-actions">
                            <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={() => toggleMembers(group.id)}>
                              {detail ? '접기' : '멤버'}
                            </button>
                            <button
                              type="button"
                              className="adm-btn adm-btn--danger adm-btn--sm"
                              disabled={deletingId === group.id}
                              onClick={() => handleDelete(group)}
                            >
                              {deletingId === group.id ? '삭제 중' : '삭제'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {detail && (
                        <tr>
                          <td colSpan={4} style={{ background: 'var(--adm-surface-2)' }}>
                            {detail.loading ? (
                              <span className="adm-help">불러오는 중...</span>
                            ) : detail.message ? (
                              <span className="adm-error">{detail.message}</span>
                            ) : detail.members.length === 0 ? (
                              <span className="adm-help">멤버가 없습니다.</span>
                            ) : (
                              <div className="adm-members">
                                {detail.members.map((member) => (
                                  <span
                                    key={member.id}
                                    className={cx('adm-member-chip', member.role === 'LEADER' && 'adm-member-chip--leader')}
                                  >
                                    {member.nickname}
                                    {member.role === 'LEADER' && ' · 그룹장'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default GroupManagement;
