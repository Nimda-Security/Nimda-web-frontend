import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Info } from 'lucide-react';

/* 관리자 화면 공통 조각. 스타일은 AdminDashboard.css 의 adm-* 클래스. */

export const cx = (...names) => names.filter(Boolean).join(' ');

export const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const p = (n) => String(n).padStart(2, '0');
  return `${formatDate(value)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const PageHeader = ({ title, description, actions, extra }) => (
  <header className="adm-head">
    <div>
      <h2 className="adm-head__title">
        {title}
        {extra}
      </h2>
      {description && <p className="adm-head__desc">{description}</p>}
    </div>
    {actions && <div className="adm-head__actions">{actions}</div>}
  </header>
);

export const Badge = ({ tone, children }) => (
  <span className={cx('adm-badge', tone && `adm-badge--${tone}`)}>{children}</span>
);

export const Avatar = ({ src, name, size, tone }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span className={cx('adm-avatar', size && `adm-avatar--${size}`, tone && `adm-avatar--${tone}`)}>
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : initial}
    </span>
  );
};

export const Empty = ({ icon, iconTone, title, children, action }) => (
  <div className="adm-empty">
    {icon && <div className={cx('adm-empty__icon', iconTone && `adm-empty__icon--${iconTone}`)}>{icon}</div>}
    {title && <p className="adm-empty__title">{title}</p>}
    {children && <p>{children}</p>}
    {action}
  </div>
);

export const Loading = ({ children = '불러오는 중...' }) => <div className="adm-loading">{children}</div>;

export const Toggle = ({ on, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={Boolean(on)}
    aria-label={label}
    className={cx('adm-toggle', on && 'adm-toggle--on')}
    onClick={() => onChange?.(!on)}
    disabled={disabled}
  />
);

export const Segmented = ({ items, value, onChange }) => (
  <div className="adm-seg" role="tablist">
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        role="tab"
        aria-selected={value === item.value}
        className={cx('adm-seg__btn', value === item.value && 'adm-seg__btn--active')}
        onClick={() => onChange(item.value)}
      >
        {item.label}
        {item.count !== undefined && <span className="adm-seg__count">{item.count}</span>}
      </button>
    ))}
  </div>
);

/** 목록을 클라이언트에서 페이지로 나눈다 (API 는 그대로 전체 조회). */
export const usePaged = (items, pageSize, resetKey) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => setPage(1), [resetKey]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const start = (page - 1) * pageSize;
  return {
    page,
    setPage,
    pageCount,
    rows: items.slice(start, start + pageSize),
    from: items.length ? start + 1 : 0,
    to: Math.min(start + pageSize, items.length),
  };
};

export const Pagination = ({ page, pageCount, onChange }) => {
  if (pageCount <= 1) return null;
  const nums = [];
  const lo = Math.max(1, Math.min(page - 2, pageCount - 4));
  const hi = Math.min(pageCount, lo + 4);
  for (let i = lo; i <= hi; i += 1) nums.push(i);
  return (
    <div className="adm-pager">
      <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="이전 페이지">
        <ChevronLeft size={14} />
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          className={cx('adm-btn adm-btn--sm adm-pager__num', n === page ? 'adm-btn--primary' : 'adm-btn--ghost')}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="다음 페이지">
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

/* ---------- 확인 모달 ----------
   window.confirm 대신 쓴다. await confirmDialog({...}) → true/false.
   <ConfirmHost /> 가 화면에 한 번 그려져 있어야 한다 (AdminLayout 이 그린다). */
let openConfirm = null;

export const confirmDialog = (options) => {
  if (!openConfirm) return Promise.resolve(window.confirm(options.message || options.title));
  return new Promise((resolve) => openConfirm({ ...options, resolve }));
};

export const ConfirmHost = () => {
  const [req, setReq] = useState(null);

  useEffect(() => {
    openConfirm = setReq;
    return () => {
      openConfirm = null;
    };
  }, []);

  useEffect(() => {
    if (!req) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!req) return null;

  function close(result) {
    req.resolve(result);
    setReq(null);
  }

  const danger = Boolean(req.danger);
  return (
    <div className="adm-modal-overlay" onClick={() => close(false)}>
      <div className="adm-modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={cx('adm-modal__icon', danger && 'adm-modal__icon--danger')}>
          {danger ? <AlertTriangle size={22} /> : <Info size={22} />}
        </div>
        <p className="adm-modal__title">{req.title}</p>
        {req.message && <p className="adm-modal__message">{req.message}</p>}
        <div className="adm-modal__actions">
          <button type="button" className="adm-btn adm-btn--secondary" onClick={() => close(false)}>
            {req.cancelText || '취소'}
          </button>
          <button
            type="button"
            autoFocus
            className={cx('adm-btn', danger ? 'adm-btn--danger-solid' : 'adm-btn--primary')}
            onClick={() => close(true)}
          >
            {req.confirmText || '확인'}
          </button>
        </div>
      </div>
    </div>
  );
};
