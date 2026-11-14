import React, { useEffect, useState } from 'react';
import {
  createGroupAPI,
  deleteGroupAPI,
  getAllGroupsAPI,
  getGroupDetailAPI,
} from '@/api/admin/admin';

const MAX_CAPACITY = 15;
const MAX_DESCRIPTION = 200;

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };

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
    if (!window.confirm(`"${group.name}" 그룹을 삭제하시겠습니까? 멤버 정보도 함께 삭제됩니다.`)) {
      return;
    }
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
    <div>
      <div className="admin__header-row">
        <h2 className="admin__section-title">스터디 그룹 관리</h2>
      </div>

      <form
        onSubmit={handleCreate}
        className="admin__content-card"
        style={{
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '18px',
          marginBottom: '28px',
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800 }}>
            그룹 만들기
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#8e8e8e' }}>
            그룹을 만든 관리자가 그룹장이 됩니다. 수정·삭제는 그룹장만 할 수 있습니다.
          </p>
        </div>

        <label style={fieldStyle}>
          <span className="admin__form-label">그룹 이름</span>
          <input
            type="text"
            value={name}
            maxLength={50}
            onChange={(event) => setName(event.target.value)}
            className="admin__form-input"
            placeholder="예: 웹 해킹 스터디"
          />
        </label>

        <label style={fieldStyle}>
          <span className="admin__form-label">최대 인원</span>
          <input
            type="number"
            min={1}
            max={MAX_CAPACITY}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            className="admin__form-input"
          />
        </label>

        <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
          <span className="admin__form-label">
            설명 ({description.length}/{MAX_DESCRIPTION})
          </span>
          <input
            type="text"
            value={description}
            maxLength={MAX_DESCRIPTION}
            onChange={(event) => setDescription(event.target.value)}
            className="admin__form-input"
            placeholder="선택 입력"
          />
        </label>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="admin__btn admin__btn--primary" disabled={saving}>
            {saving ? '생성 중...' : '그룹 생성'}
          </button>
        </div>
      </form>

      <div className="admin__content-card" style={{ padding: '24px' }}>
        <form
          onSubmit={handleSearch}
          style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
        >
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="admin__form-input"
            placeholder="그룹 이름으로 검색"
            style={{ flex: 1 }}
          />
          <button type="submit" className="admin__btn admin__btn--primary">
            검색
          </button>
        </form>

        {loading ? (
          <p className="admin__empty-text">불러오는 중...</p>
        ) : groups.length === 0 ? (
          <p className="admin__empty-text">
            {keyword.trim() ? '검색 결과가 없습니다.' : '등록된 그룹이 없습니다.'}
          </p>
        ) : (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>인원</th>
                  <th>설명</th>
                  <th style={{ width: '180px' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const detail = expanded[group.id];
                  return (
                    <React.Fragment key={group.id}>
                      <tr>
                        <td style={{ fontWeight: 700 }}>{group.name}</td>
                        <td>
                          {group.currentMemberCount}/{group.capacity}
                        </td>
                        <td style={{ color: '#8e8e8e' }}>{group.description || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="admin__btn"
                              onClick={() => toggleMembers(group.id)}
                            >
                              {detail ? '접기' : '멤버'}
                            </button>
                            <button
                              type="button"
                              className="admin__btn admin__btn--danger"
                              disabled={deletingId === group.id}
                              onClick={() => handleDelete(group)}
                            >
                              {deletingId === group.id ? '삭제 중...' : '삭제'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {detail && (
                        <tr>
                          <td colSpan={4} style={{ background: '#fafafa' }}>
                            {detail.loading ? (
                              <span className="admin__empty-text">불러오는 중...</span>
                            ) : detail.message ? (
                              <span style={{ color: '#d64454' }}>{detail.message}</span>
                            ) : detail.members.length === 0 ? (
                              <span className="admin__empty-text">멤버가 없습니다.</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {detail.members.map((member) => (
                                  <span
                                    key={member.id}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '13px',
                                      border: '1px solid #e5e5e5',
                                      borderRadius: '999px',
                                      background: '#fff',
                                      fontWeight: member.role === 'LEADER' ? 700 : 400,
                                    }}
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
    </div>
  );
};

export default GroupManagement;
