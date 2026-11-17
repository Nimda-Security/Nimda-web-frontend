import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Pin, RefreshCw, Search } from 'lucide-react';
import {
  Avatar,
  Badge,
  Empty,
  Loading,
  PageHeader,
  Pagination,
  Segmented,
  confirmDialog,
  cx,
  formatDate,
  usePaged,
} from '../components/AdminUI';

const PAGE_SIZE = 15;

const flatten = (tree, level = 0) =>
  tree.flatMap((c) => [{ ...c, level }, ...flatten(c.children || [], level + 1)]);

const PostManagement = ({
  categoriesLoading,
  activeCategoryTree,
  loadCategories,
  selectedPostCategoryId,
  setSelectedPostCategoryId,
  loadPosts,
  postsLoading,
  posts,
  handleDeletePost,
  handleTogglePin,
  handleEditPost,
}) => {
  const [tab, setTab] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [pinningId, setPinningId] = useState(null);

  const flat = useMemo(() => flatten(activeCategoryTree), [activeCategoryTree]);
  const selectedCategory = flat.find((c) => c.id === selectedPostCategoryId) || null;

  const selectCategory = (id) => {
    const category = flat.find((c) => c.id === id);
    if (!category) return;
    setSelectedPostCategoryId(category.id);
    loadPosts(category.slug);
  };

  // 처음 들어오면 첫 번째 카테고리를 자동으로 연다
  useEffect(() => {
    if (!selectedPostCategoryId && flat.length > 0) selectCategory(flat[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat.length]);

  const pinnedCount = posts.filter((p) => p.pinned).length;

  const visible = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return posts
      .filter((p) => (tab === 'pinned' ? p.pinned : true))
      .filter(
        (p) =>
          !q ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.author?.nickname || '').toLowerCase().includes(q)
      )
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  }, [posts, tab, keyword]);

  const paged = usePaged(visible, PAGE_SIZE, `${selectedPostCategoryId}|${tab}|${keyword}`);

  const onTogglePin = async (post) => {
    setPinningId(post.id);
    try {
      await handleTogglePin(post.id);
    } finally {
      setPinningId(null);
    }
  };

  const onDelete = async (post) => {
    const ok = await confirmDialog({
      title: '게시글을 삭제할까요?',
      message: `"${post.title}"\n삭제한 글은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      danger: true,
    });
    if (ok) handleDeletePost(post.id);
  };

  return (
    <>
      <PageHeader
        title="게시글 관리"
        description="게시글을 고정하거나 수정·삭제합니다. 고정한 글은 게시판 맨 위에 보입니다."
        actions={
          selectedCategory && (
            <button
              type="button"
              className="adm-btn adm-btn--secondary"
              onClick={() => loadPosts(selectedCategory.slug)}
              disabled={postsLoading}
            >
              <RefreshCw size={15} />
              {postsLoading ? '불러오는 중' : '새로고침'}
            </button>
          )
        }
      />

      <div className="adm-card">
        <div className="adm-toolbar">
          <select
            className="adm-select"
            style={{ width: 200 }}
            value={selectedPostCategoryId || ''}
            onChange={(e) => selectCategory(Number(e.target.value))}
            disabled={categoriesLoading || flat.length === 0}
            aria-label="카테고리"
          >
            {flat.length === 0 && <option value="">카테고리 없음</option>}
            {flat.map((c) => (
              <option key={c.id} value={c.id}>
                {c.level > 0 ? `${'  '.repeat(c.level)}└ ` : ''}
                {c.name}
              </option>
            ))}
          </select>
          <Segmented
            value={tab}
            onChange={setTab}
            items={[
              { value: 'all', label: '전체', count: posts.length },
              { value: 'pinned', label: '고정됨', count: pinnedCount },
            ]}
          />
          <label className="adm-search">
            <Search size={16} />
            <input
              className="adm-input"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="제목, 작성자로 검색"
            />
          </label>
        </div>

        {categoriesLoading && flat.length === 0 ? (
          <Loading />
        ) : flat.length === 0 ? (
          <Empty
            icon={<FileText size={22} />}
            title="카테고리가 없습니다"
            action={
              <button type="button" className="adm-btn adm-btn--secondary" onClick={loadCategories}>
                불러오기
              </button>
            }
          />
        ) : postsLoading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <Empty icon={<FileText size={22} />} title={posts.length === 0 ? '게시글이 없습니다' : '조건에 맞는 글이 없습니다'}>
            {posts.length === 0 ? `${selectedCategory?.name || '이 카테고리'}에 작성된 글이 없어요.` : '탭이나 검색어를 바꿔 보세요.'}
          </Empty>
        ) : (
          <>
            <div className="adm-table-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>고정</th>
                    <th>제목</th>
                    <th>작성자</th>
                    <th>작성일</th>
                    <th className="is-right">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((post) => (
                    <tr key={post.id} className={cx(post.pinned && 'is-pinned')}>
                      <td>
                        <button
                          type="button"
                          className="adm-icon-btn"
                          style={post.pinned ? { background: 'var(--adm-pink-bg)', color: 'var(--adm-pink)' } : { color: '#bcbcbc' }}
                          disabled={pinningId === post.id}
                          onClick={() => onTogglePin(post)}
                          title={post.pinned ? '고정 해제' : '고정'}
                          aria-label={post.pinned ? '고정 해제' : '고정'}
                          aria-pressed={Boolean(post.pinned)}
                        >
                          <Pin size={16} fill={post.pinned ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td>
                        <div className="adm-row">
                          {post.pinned && <Badge tone="pink">고정</Badge>}
                          <span style={{ fontWeight: post.pinned ? 500 : 400, wordBreak: 'break-all' }}>{post.title}</span>
                        </div>
                      </td>
                      <td>
                        <div className="adm-row" style={{ whiteSpace: 'nowrap' }}>
                          <Avatar src={post.author?.profileImage} name={post.author?.nickname} size="sm" />
                          <span className="is-num">{post.author?.nickname || '-'}</span>
                        </div>
                      </td>
                      <td className="is-date">{formatDate(post.createdAt)}</td>
                      <td>
                        <div className="adm-cell-actions">
                          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => handleEditPost(post.category?.slug ? post : { ...post, category: { slug: selectedCategory?.slug } })}>
                            수정
                          </button>
                          <button type="button" className="adm-btn adm-btn--danger adm-btn--sm" onClick={() => onDelete(post)}>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="adm-tfoot">
              <span>
                {visible.length}개 중 {paged.from}–{paged.to}
              </span>
              <Pagination page={paged.page} pageCount={paged.pageCount} onChange={paged.setPage} />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PostManagement;
