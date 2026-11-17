import React, { useEffect, useState } from 'react';
import { GripVertical, Info, ListTree, Plus } from 'lucide-react';
import {
  Badge,
  Empty,
  Loading,
  PageHeader,
  Toggle,
  confirmDialog,
  cx,
} from '../components/AdminUI';

const PLANNED_OPTIONS = [
  ['카테고리 옆에 글 개수 표시', '카테고리 이름 옆에 글 개수를 보여줍니다.'],
  ['앨범형으로 보기', '첨부한 이미지·동영상 썸네일이 보이는 형식입니다.'],
  ['블로그 기본 카테고리', '블로그에서 이 카테고리를 기본으로 보여줍니다.'],
  ['카테고리 접기', '하위 카테고리를 접은 상태로 보여줍니다.'],
];

const countAll = (tree) => tree.reduce((n, c) => n + 1 + countAll(c.children || []), 0);

const CategoryManagement = ({
  setShowAddCategoryModal,
  handleDeleteCategory,
  selectedCategoryId,
  setSelectedCategoryId,
  categoryTree,
  categoriesLoading,
  loadCategories,
  selectedCategoryData,
  updateCategoryAPI,
  categoryRedirectUrl,
  setCategoryRedirectUrl,
  localCategoryTree,
  handleCategoryDrop,
  handleToggleCategoryActive,
  handleSaveOrder,
  savingOrder,
  orderChanged,
}) => {
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [savingNameSlug, setSavingNameSlug] = useState(false);
  const [savingOption, setSavingOption] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    if (selectedCategoryData) {
      setEditName(selectedCategoryData.name || '');
      setEditSlug(selectedCategoryData.slug || '');
    }
  }, [selectedCategoryData?.id]);

  const parentName = selectedCategoryData?.parentId
    ? categoryTree.find((c) => c.id === selectedCategoryData.parentId)?.name
    : null;

  const handleSaveNameSlug = async () => {
    if (!selectedCategoryId || !selectedCategoryData) return;
    const trimmedName = editName.trim();
    const trimmedSlug = editSlug.trim();
    if (!trimmedName) {
      alert('카테고리명을 입력해주세요.');
      return;
    }
    if (!trimmedSlug) {
      alert('슬러그를 입력해주세요.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      alert('슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.');
      return;
    }
    setSavingNameSlug(true);
    try {
      const result = await updateCategoryAPI(selectedCategoryId, {
        name: trimmedName,
        slug: trimmedSlug,
      });
      if (result.success) {
        alert('카테고리명과 슬러그가 저장되었습니다.');
        await loadCategories();
      } else {
        alert(result.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('카테고리명/슬러그 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSavingNameSlug(false);
    }
  };

  const handleSaveRedirect = async () => {
    if (!selectedCategoryId) return;
    setSavingOption(true);
    try {
      const result = await updateCategoryAPI(selectedCategoryId, {
        name: selectedCategoryData.name,
        slug: selectedCategoryData.slug,
        parentId: selectedCategoryData.parentId,
        sortOrder: selectedCategoryData.sortOrder,
        isActive: selectedCategoryData.isActive,
        redirectUrl: categoryRedirectUrl.trim() || null,
      });
      if (result.success) {
        alert('바로가기 URL이 저장되었습니다.');
        await loadCategories();
      } else {
        alert(result.message || 'URL 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('URL 저장 오류:', error);
      alert('URL 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingOption(false);
    }
  };

  const handleShopToggle = async (next) => {
    if (!selectedCategoryId) return;
    setSavingOption(true);
    try {
      const result = await updateCategoryAPI(selectedCategoryId, {
        name: selectedCategoryData.name,
        slug: selectedCategoryData.slug,
        parentId: selectedCategoryData.parentId,
        sortOrder: selectedCategoryData.sortOrder,
        isActive: selectedCategoryData.isActive,
        redirectUrl: selectedCategoryData.redirectUrl || null,
        shopEnabled: next,
      });
      if (result.success) {
        await loadCategories();
      } else {
        alert(result.message || '마일리지 구매 화면 설정에 실패했습니다.');
      }
    } catch (error) {
      console.error('마일리지 구매 화면 저장 오류:', error);
      alert('마일리지 구매 화면 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingOption(false);
    }
  };

  const handleActiveToggle = async () => {
    const hide = selectedCategoryData.isActive !== false;
    const ok = await confirmDialog({
      title: hide ? `"${selectedCategoryData.name}"을(를) 숨길까요?` : `"${selectedCategoryData.name}"을(를) 다시 표시할까요?`,
      message: hide ? '숨기면 사이트 메뉴와 게시판 목록에서 보이지 않습니다.' : '사이트 메뉴와 게시판 목록에 다시 보입니다.',
      confirmText: hide ? '숨기기' : '표시하기',
      danger: hide,
    });
    if (ok) handleToggleCategoryActive(selectedCategoryData);
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: `"${selectedCategoryData.name}" 카테고리를 삭제할까요?`,
      message: '삭제한 카테고리는 되돌릴 수 없습니다.\n잠시 숨기려면 삭제 대신 "사이트에 표시"를 끄세요.',
      confirmText: '삭제',
      danger: true,
    });
    if (ok) handleDeleteCategory();
  };

  const renderRow = (category, level = 0) => {
    const childCount = category.children?.length || 0;
    const inactive = category.isActive === false;
    return (
      <React.Fragment key={category.id}>
        <div
          className={cx(
            'adm-tree-row',
            level === 0 && 'adm-tree-row--root',
            selectedCategoryId === category.id && 'adm-tree-row--selected',
            inactive && 'adm-tree-row--inactive',
            dragOverId === category.id && 'adm-tree-row--dragover',
            draggedId === category.id && 'adm-tree-row--dragging'
          )}
          style={{ '--adm-level': level }}
          draggable
          onDragStart={(e) => {
            setDraggedId(category.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setDragOverId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedId !== category.id) setDragOverId(category.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedId && draggedId !== category.id) handleCategoryDrop(draggedId, category.id);
            setDraggedId(null);
            setDragOverId(null);
          }}
          onClick={() => setSelectedCategoryId(category.id)}
        >
          <GripVertical size={16} className="adm-tree-row__grip" />
          <span className="adm-tree-row__name">{category.name}</span>
          {childCount > 0 && <span className="adm-tree-row__count">{childCount}</span>}
          <span className="adm-tree-row__badges">
            {category.redirectUrl && <Badge tone="blue">바로가기</Badge>}
            {category.shopEnabled && <Badge tone="yellow">상점</Badge>}
            {inactive && <Badge tone="red">숨김</Badge>}
          </span>
        </div>
        {category.children?.map((child) => renderRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <>
      <PageHeader
        title="카테고리"
        extra={orderChanged && <Badge tone="yellow">저장 안 된 순서 변경</Badge>}
        description="순서를 정리하고, 카테고리를 선택해 설정을 바꿉니다."
        actions={
          <>
            <button type="button" className="adm-btn adm-btn--secondary" onClick={() => setShowAddCategoryModal(true)}>
              <Plus size={15} />
              카테고리 추가
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              onClick={handleSaveOrder}
              disabled={savingOrder || !orderChanged}
            >
              {savingOrder ? '저장 중...' : '순서 저장'}
            </button>
          </>
        }
      />

      <div className="adm-split">
        <div className="adm-split__main adm-card">
          <div className="adm-toolbar" style={{ borderBottom: '1px solid #ececec' }}>
            <Info size={16} color="#8b8b8b" />
            <span className="adm-help" style={{ fontSize: 13 }}>
              같은 단계 안에서 끌어서 순서를 바꾼 뒤 <b>순서 저장</b>을 누르세요. 전체 {countAll(localCategoryTree)}개
            </span>
          </div>
          {categoriesLoading && localCategoryTree.length === 0 ? (
            <Loading />
          ) : localCategoryTree.length === 0 ? (
            <Empty
              icon={<ListTree size={22} />}
              title="카테고리가 없습니다"
              action={
                <button type="button" className="adm-btn adm-btn--secondary" onClick={loadCategories}>
                  불러오기
                </button>
              }
            />
          ) : (
            <div>{localCategoryTree.map((c) => renderRow(c, 0))}</div>
          )}
        </div>

        <aside className="adm-split__side adm-split__side--wide adm-card">
          {selectedCategoryData ? (
            <>
              <div className="adm-panel-head">
                <div>
                  <p className="adm-panel-head__eyebrow">카테고리 설정</p>
                  <p className="adm-panel-head__title">
                    {parentName ? `${parentName} › ` : ''}
                    {selectedCategoryData.name}
                  </p>
                </div>
              </div>

              <div className="adm-panel-sec adm-form">
                <label className="adm-field">
                  <span className="adm-label">카테고리명</span>
                  <input className="adm-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="카테고리명" />
                </label>
                <label className="adm-field">
                  <span className="adm-label">슬러그</span>
                  <input
                    className="adm-input"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value.toLowerCase())}
                    placeholder="예: notice, free-talk"
                  />
                  <span className="adm-help">영문 소문자, 숫자, 하이픈(-)만 쓸 수 있고 주소에 쓰입니다.</span>
                </label>
                <div className="adm-form__actions">
                  <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={handleSaveNameSlug} disabled={savingNameSlug}>
                    {savingNameSlug ? '저장 중...' : '이름·슬러그 저장'}
                  </button>
                </div>
              </div>

              <div className="adm-panel-sec">
                <label className="adm-field">
                  <span className="adm-label">바로가기 URL</span>
                  <div className="adm-row">
                    <input
                      type="url"
                      className="adm-input"
                      placeholder="예: https://example.com"
                      value={categoryRedirectUrl}
                      onChange={(e) => setCategoryRedirectUrl(e.target.value)}
                    />
                    <button type="button" className="adm-btn adm-btn--secondary" onClick={handleSaveRedirect} disabled={savingOption}>
                      저장
                    </button>
                  </div>
                  <span className="adm-help">입력하면 카테고리를 누를 때 이 주소로 이동합니다. 비워두면 일반 게시판입니다.</span>
                </label>
              </div>

              <div className="adm-panel-sec">
                <p className="adm-panel-sec__title">표시 옵션</p>
                <div className="adm-opts">
                  <div className="adm-opt">
                    <div className="adm-opt__text">
                      <p className="adm-opt__title">사이트에 표시</p>
                      <p className="adm-opt__desc">끄면 메뉴와 게시판 목록에서 숨겨집니다.</p>
                    </div>
                    <Toggle on={selectedCategoryData.isActive !== false} onChange={handleActiveToggle} label="사이트에 표시" />
                  </div>
                  <div className="adm-opt">
                    <div className="adm-opt__text">
                      <p className="adm-opt__title">마일리지 구매 화면</p>
                      <p className="adm-opt__desc">
                        아이템 구매 화면으로 보여줍니다. 제목은 상품명, 태그는 상품 종류, 첨부 이미지는 상품 이미지, 가격은 작성 화면에서 입력한 NC로 표시됩니다.
                      </p>
                    </div>
                    <Toggle
                      on={Boolean(selectedCategoryData.shopEnabled)}
                      onChange={handleShopToggle}
                      disabled={savingOption}
                      label="마일리지 구매 화면"
                    />
                  </div>
                  {PLANNED_OPTIONS.map(([title, desc]) => (
                    <div key={title} className="adm-opt adm-opt--disabled">
                      <div className="adm-opt__text">
                        <p className="adm-opt__title">
                          {title} <Badge>준비 중</Badge>
                        </p>
                        <p className="adm-opt__desc">{desc}</p>
                      </div>
                      <Toggle on={false} disabled label={title} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="adm-panel-foot">
                <button type="button" className="adm-btn adm-btn--danger" onClick={handleDelete}>
                  카테고리 삭제
                </button>
              </div>
            </>
          ) : (
            <Empty icon={<ListTree size={22} />} title="카테고리를 선택하세요">
              왼쪽 목록에서 카테고리를 누르면
              <br />
              설정을 확인하고 바꿀 수 있습니다.
            </Empty>
          )}
        </aside>
      </div>
    </>
  );
};

export default CategoryManagement;
