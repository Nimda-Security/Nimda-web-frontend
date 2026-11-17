import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Tag } from 'lucide-react';
import { getTagsByCategoryAPI, addTagAPI, deleteTagAPI, updateTagAPI } from '@/api/tag';
import { getTagStatsAPI, deactivateBoardsByTagAPI, activateBoardsByTagAPI } from '@/api/admin/admin';
import { Badge, Empty, Loading, PageHeader, confirmDialog, cx } from '../components/AdminUI';

const flatten = (tree, level = 0) =>
  tree.flatMap((c) => [{ ...c, level }, ...flatten(c.children || [], level + 1)]);

const TagManagement = ({
  categoryTree,
  categoriesLoading,
  loadCategories,
  selectedCategoryId,
  setSelectedCategoryId,
}) => {
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [stats, setStats] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagSortValue, setNewTagSortValue] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagSortValue, setEditTagSortValue] = useState('');
  const [editTagCategoryId, setEditTagCategoryId] = useState(null);
  const [savingTag, setSavingTag] = useState(false);
  const [busyTagId, setBusyTagId] = useState(null);

  const flat = useMemo(() => flatten(categoryTree), [categoryTree]);
  const selectedCategory = flat.find((c) => c.id === selectedCategoryId) || null;
  const statsById = useMemo(() => new Map(stats.map((s) => [s.tagId, s])), [stats]);

  const loadTags = async () => {
    if (!selectedCategoryId) {
      setTags([]);
      return;
    }
    setTagsLoading(true);
    try {
      setTags(await getTagsByCategoryAPI(selectedCategoryId));
    } catch {
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!selectedCategoryId) {
      setStats([]);
      return;
    }
    try {
      const result = await getTagStatsAPI(selectedCategoryId);
      setStats(result.success ? result.tagStats || [] : []);
    } catch {
      setStats([]);
    }
  };

  useEffect(() => {
    loadTags();
    loadStats();
    setEditingTagId(null);
    setNewTagName('');
    setNewTagSortValue('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      alert('태그 이름을 입력해주세요.');
      return;
    }
    setAddingTag(true);
    try {
      const sortVal = newTagSortValue ? parseInt(newTagSortValue, 10) : tags.length;
      const result = await addTagAPI({
        name: newTagName.trim(),
        categoryId: selectedCategoryId,
        sortValue: isNaN(sortVal) ? tags.length : sortVal,
      });
      if (result.success) {
        setNewTagName('');
        setNewTagSortValue('');
        await Promise.all([loadTags(), loadStats()]);
      } else {
        alert(result.message || '태그 추가에 실패했습니다.');
      }
    } catch {
      alert('태그 추가 중 오류가 발생했습니다.');
    } finally {
      setAddingTag(false);
    }
  };

  const handleDeleteTag = async (tag) => {
    const ok = await confirmDialog({
      title: `#${tag.tagName} 태그를 삭제할까요?`,
      message: '삭제한 태그는 되돌릴 수 없습니다.',
      confirmText: '삭제',
      danger: true,
    });
    if (!ok) return;
    setBusyTagId(tag.id);
    try {
      const result = await deleteTagAPI(tag.id);
      if (result.success) {
        await Promise.all([loadTags(), loadStats()]);
      } else {
        alert(result.message || '태그 삭제에 실패했습니다.');
      }
    } catch {
      alert('태그 삭제 중 오류가 발생했습니다.');
    } finally {
      setBusyTagId(null);
    }
  };

  const handleStartEdit = (tag) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.tagName);
    setEditTagSortValue(String(tag.sortValue ?? ''));
    setEditTagCategoryId(tag.categoryId);
  };

  const handleSaveEdit = async () => {
    if (!editTagName.trim()) {
      alert('태그 이름을 입력해주세요.');
      return;
    }
    setSavingTag(true);
    try {
      const sortVal = editTagSortValue ? parseInt(editTagSortValue, 10) : undefined;
      const result = await updateTagAPI(editingTagId, {
        name: editTagName.trim(),
        sortValue: isNaN(sortVal) ? undefined : sortVal,
        categoryId: editTagCategoryId || undefined,
      });
      if (result.success) {
        setEditingTagId(null);
        await Promise.all([loadTags(), loadStats()]);
      } else {
        alert(result.message || '태그 수정에 실패했습니다.');
      }
    } catch {
      alert('태그 수정 중 오류가 발생했습니다.');
    } finally {
      setSavingTag(false);
    }
  };

  const handleMoveTag = async (index, direction) => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= tags.length) return;
    const current = tags[index];
    const swap = tags[swapIndex];
    try {
      await Promise.all([
        updateTagAPI(current.id, { sortValue: swap.sortValue }),
        updateTagAPI(swap.id, { sortValue: current.sortValue }),
      ]);
      await loadTags();
    } catch {
      alert('순서 변경 중 오류가 발생했습니다.');
    }
  };

  const handleBoards = async (tag, mode) => {
    const hide = mode === 'hide';
    const ok = await confirmDialog({
      title: hide ? `#${tag.tagName} 글을 모두 숨길까요?` : `#${tag.tagName} 글을 다시 보이게 할까요?`,
      message: hide
        ? `이 카테고리에서 #${tag.tagName} 태그가 달린 활성 게시글이 모두 비활성화됩니다.`
        : `이 카테고리에서 #${tag.tagName} 태그가 달린 비활성 게시글이 모두 다시 활성화됩니다.`,
      confirmText: hide ? '숨기기' : '보이기',
      danger: hide,
    });
    if (!ok) return;
    setBusyTagId(tag.id);
    try {
      const result = hide
        ? await deactivateBoardsByTagAPI(selectedCategoryId, tag.id)
        : await activateBoardsByTagAPI(selectedCategoryId, tag.id);
      if (result.success) {
        alert(result.message || (hide ? '비활성화되었습니다.' : '활성화되었습니다.'));
        await loadStats();
      } else {
        alert(result.message || (hide ? '비활성화에 실패했습니다.' : '활성화에 실패했습니다.'));
      }
    } catch {
      alert(hide ? '비활성화 중 오류가 발생했습니다.' : '활성화 중 오류가 발생했습니다.');
    } finally {
      setBusyTagId(null);
    }
  };

  const onEnter = (fn) => (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fn();
    }
  };

  return (
    <>
      <PageHeader
        title="태그"
        description="카테고리별 태그를 추가·정렬하고, 태그 단위로 게시글을 숨기거나 다시 보이게 합니다."
      />

      <div className="adm-split">
        <nav className="adm-split__nav adm-card">
          <div className="adm-toolbar" style={{ borderBottom: '1px solid #ececec' }}>
            <span className="adm-label">카테고리</span>
          </div>
          {categoriesLoading && flat.length === 0 ? (
            <Loading />
          ) : flat.length === 0 ? (
            <Empty
              title="카테고리가 없습니다"
              action={
                <button type="button" className="adm-btn adm-btn--secondary" onClick={loadCategories}>
                  불러오기
                </button>
              }
            />
          ) : (
            flat.map((c) => (
              <div
                key={c.id}
                className={cx(
                  'adm-tree-row',
                  c.level === 0 && 'adm-tree-row--root',
                  selectedCategoryId === c.id && 'adm-tree-row--selected',
                  c.isActive === false && 'adm-tree-row--inactive'
                )}
                style={{ '--adm-level': c.level }}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCategoryId(c.id)}
                onKeyDown={onEnter(() => setSelectedCategoryId(c.id))}
              >
                <span className="adm-tree-row__name">{c.name}</span>
              </div>
            ))
          )}
        </nav>

        <div className="adm-split__main adm-card">
          {!selectedCategory ? (
            <Empty icon={<Tag size={22} />} title="카테고리를 선택하세요">
              왼쪽에서 카테고리를 누르면 태그를 관리할 수 있습니다.
            </Empty>
          ) : (
            <>
              <div className="adm-panel-head">
                <div>
                  <p className="adm-panel-head__eyebrow">태그 목록</p>
                  <p className="adm-panel-head__title">{selectedCategory.name}</p>
                </div>
              </div>

              <div className="adm-toolbar" style={{ borderBottom: '1px solid #ececec', background: 'var(--adm-surface-2)' }}>
                <input
                  className="adm-input"
                  placeholder="새 태그 이름"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={onEnter(handleAddTag)}
                />
                <input
                  type="number"
                  className="adm-input"
                  style={{ width: 90 }}
                  placeholder="순서"
                  value={newTagSortValue}
                  onChange={(e) => setNewTagSortValue(e.target.value)}
                  onKeyDown={onEnter(handleAddTag)}
                  aria-label="순서"
                />
                <button
                  type="button"
                  className="adm-btn adm-btn--primary"
                  onClick={handleAddTag}
                  disabled={addingTag || !newTagName.trim()}
                >
                  <Plus size={15} />
                  {addingTag ? '추가 중' : '추가'}
                </button>
              </div>

              {tagsLoading ? (
                <Loading />
              ) : tags.length === 0 ? (
                <Empty icon={<Tag size={22} />} title="등록된 태그가 없습니다">
                  위 입력칸에서 태그를 추가하세요.
                </Empty>
              ) : (
                tags.map((tag, index) => {
                  const stat = statsById.get(tag.id);
                  const busy = busyTagId === tag.id;
                  if (editingTagId === tag.id) {
                    return (
                      <div key={tag.id} className="adm-list-row adm-list-row--editing">
                        <input className="adm-input" value={editTagName} onChange={(e) => setEditTagName(e.target.value)} placeholder="태그 이름" />
                        <input
                          type="number"
                          className="adm-input"
                          style={{ width: 80 }}
                          value={editTagSortValue}
                          onChange={(e) => setEditTagSortValue(e.target.value)}
                          placeholder="순서"
                          aria-label="순서"
                        />
                        <select
                          className="adm-select"
                          style={{ width: 160 }}
                          value={editTagCategoryId || ''}
                          onChange={(e) => setEditTagCategoryId(e.target.value ? Number(e.target.value) : null)}
                          aria-label="카테고리"
                        >
                          {flat.map((c) => (
                            <option key={c.id} value={c.id}>
                              {'  '.repeat(c.level)}
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={handleSaveEdit} disabled={savingTag}>
                          {savingTag ? '저장 중' : '저장'}
                        </button>
                        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setEditingTagId(null)}>
                          취소
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div key={tag.id} className="adm-list-row">
                      <div className="adm-move">
                        <button type="button" className="adm-icon-btn" disabled={index === 0} onClick={() => handleMoveTag(index, 'up')} aria-label="위로">
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="adm-icon-btn"
                          disabled={index === tags.length - 1}
                          onClick={() => handleMoveTag(index, 'down')}
                          aria-label="아래로"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                      <span className="adm-help" style={{ width: 28, textAlign: 'center' }}>
                        {tag.sortValue}
                      </span>
                      <span style={{ fontWeight: 500 }}>#{tag.tagName}</span>
                      <span className="adm-spacer adm-badges">
                        {stat && <Badge>글 {stat.activeCount}</Badge>}
                        {stat?.hiddenCount > 0 && <Badge tone="red">숨김 {stat.hiddenCount}</Badge>}
                      </span>
                      {stat?.activeCount > 0 && (
                        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={busy} onClick={() => handleBoards(tag, 'hide')}>
                          글 숨기기
                        </button>
                      )}
                      {stat?.hiddenCount > 0 && (
                        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={busy} onClick={() => handleBoards(tag, 'show')}>
                          다시 보이기
                        </button>
                      )}
                      <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={() => handleStartEdit(tag)}>
                        수정
                      </button>
                      <button type="button" className="adm-btn adm-btn--danger adm-btn--sm" disabled={busy} onClick={() => handleDeleteTag(tag)}>
                        삭제
                      </button>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default TagManagement;
