import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { confirmDialog, cx, formatDate } from './AdminUI';

const QUICK_AMOUNTS = [100, 500, 1000];

/** 붙여넣거나 입력한 문자열을 학번 목록으로 쪼갠다 (쉼표·공백·줄바꿈 구분). */
const splitIds = (text) =>
  text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const BulkMileagePaymentForm = ({ onGrant, initialStudentId }) => {
  const [studentIds, setStudentIds] = useState(initialStudentId ? [String(initialStudentId)] : []);
  const [draft, setDraft] = useState('');
  const [mileageAmount, setMileageAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const datalistId = useRef(`student-suggestions-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/admin/users/suggestions');
        const data = await res.json();
        if (data.success) setSuggestions(data.users);
      } catch (e) {
        console.error('추천 목록 조회 실패:', e);
      }
    };
    fetchSuggestions();
  }, []);

  useEffect(() => {
    if (initialStudentId) setStudentIds((prev) => (prev.includes(String(initialStudentId)) ? prev : [...prev, String(initialStudentId)]));
  }, [initialStudentId]);

  const nameByNum = useMemo(() => new Map(suggestions.map((u) => [u.studentNum, u.name])), [suggestions]);
  const unknownIds = suggestions.length ? studentIds.filter((id) => !nameByNum.has(id)) : [];

  const addIds = (text) => {
    const ids = splitIds(text);
    if (ids.length === 0) return;
    setStudentIds((prev) => [...prev, ...ids.filter((id, i) => !prev.includes(id) && ids.indexOf(id) === i)]);
  };

  const commitDraft = () => {
    addIds(draft);
    setDraft('');
  };

  const removeId = (id) => setStudentIds((prev) => prev.filter((x) => x !== id));

  const onKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && !draft && studentIds.length) {
      setStudentIds((prev) => prev.slice(0, -1));
    }
  };

  const onDraftChange = (value) => {
    // datalist 에서 고르거나, 구분자가 들어간 값을 붙여넣으면 바로 칩으로 만든다
    if (/[\s,;]/.test(value) || nameByNum.has(value)) {
      addIds(value);
      setDraft('');
    } else {
      setDraft(value);
    }
  };

  const amount = Number(mileageAmount) || 0;
  const total = amount * studentIds.length;

  const validate = () => {
    if (studentIds.length === 0) {
      alert('지급 대상 학번을 한 명 이상 입력해 주세요.');
      return false;
    }
    if (!mileageAmount || amount <= 0) {
      alert('올바른 마일리지 금액을 입력해 주세요.');
      return false;
    }
    if (!reason.trim()) {
      alert('사유를 입력해 주세요.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (draft.trim()) {
      alert('입력 중인 학번이 있습니다. Enter 를 눌러 추가하거나 지워 주세요.');
      return;
    }
    if (!validate()) return;
    const ok = await confirmDialog({
      title: `${studentIds.length}명에게 마일리지를 지급할까요?`,
      message:
        `1인당 ${amount.toLocaleString()} NC · 총 ${total.toLocaleString()} NC\n사유: ${reason.trim()}` +
        (unknownIds.length ? `\n\n회원 목록에서 찾지 못한 학번 ${unknownIds.length}개가 있습니다: ${unknownIds.join(', ')}` : ''),
      confirmText: '지급하기',
    });
    if (!ok) return;

    setLoading(true);
    try {
      const dataList = studentIds.map((studentId) => ({ studentId, mileageAmount, reason }));
      await onGrant(dataList);
      setStudentIds([]);
      setMileageAmount('');
      setReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-split">
      <div className="adm-split__main adm-card">
        <div className="adm-card__body adm-form" style={{ gap: 28 }}>
          {/* 1. 지급 대상 */}
          <div className="adm-field" style={{ gap: 8 }}>
            <p className="adm-step">
              <span className="adm-step__num">1</span>지급 대상
            </p>
            <p className="adm-help">학번을 입력하고 Enter. 여러 명은 쉼표·공백·줄바꿈으로 한 번에 붙여넣을 수 있어요.</p>
            <datalist id={datalistId.current}>
              {suggestions.map((u) => (
                <option key={u.studentNum} value={u.studentNum} label={u.name} />
              ))}
            </datalist>
            <div className="adm-chips" onClick={() => inputRef.current?.focus()}>
              {studentIds.map((id) => {
                const name = nameByNum.get(id);
                const unknown = suggestions.length > 0 && !name;
                return (
                  <span key={id} className={cx('adm-chip', unknown && 'adm-chip--warn')} title={unknown ? '회원 목록에서 찾지 못한 학번' : undefined}>
                    {id}
                    {name && <span className="adm-chip__name">{name}</span>}
                    <button type="button" className="adm-chip__x" onClick={() => removeId(id)} aria-label={`${id} 빼기`}>
                      <X size={13} />
                    </button>
                  </span>
                );
              })}
              <input
                ref={inputRef}
                list={datalistId.current}
                value={draft}
                placeholder={studentIds.length ? '학번 추가' : '학번 입력'}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={commitDraft}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (splitIds(text).length > 1) {
                    e.preventDefault();
                    addIds(text);
                  }
                }}
              />
            </div>
            {unknownIds.length > 0 && (
              <p className="adm-error" style={{ color: '#8a6410' }}>
                <AlertTriangle size={14} />
                회원 목록에서 찾지 못한 학번이 {unknownIds.length}개 있습니다. 오타가 아닌지 확인해 주세요.
              </p>
            )}
          </div>

          {/* 2. 금액 */}
          <div className="adm-field" style={{ gap: 8 }}>
            <p className="adm-step">
              <span className="adm-step__num">2</span>1인당 지급 마일리지
            </p>
            <div className="adm-row" style={{ flexWrap: 'wrap' }}>
              <input
                type="number"
                className="adm-input"
                style={{ width: 200 }}
                value={mileageAmount}
                placeholder="금액 입력"
                min={1}
                onChange={(e) => setMileageAmount(e.target.value)}
              />
              <span className="adm-label">NC</span>
              <span style={{ width: 8 }} />
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="adm-btn adm-btn--secondary adm-btn--sm"
                  onClick={() => setMileageAmount(String((Number(mileageAmount) || 0) + q))}
                >
                  +{q.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 사유 */}
          <div className="adm-field" style={{ gap: 8 }}>
            <p className="adm-step">
              <span className="adm-step__num">3</span>지급 사유
            </p>
            <textarea
              className="adm-textarea"
              value={reason}
              placeholder="예: 2026 NIMDA CTF 1위 상금"
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="adm-help adm-row" style={{ gap: 6 }}>
              <Info size={14} />
              사유는 회원의 마이페이지 마일리지 내역에 그대로 보입니다.
            </p>
          </div>
        </div>
      </div>

      <aside className="adm-split__side adm-card">
        <div className="adm-card__body adm-form" style={{ gap: 16 }}>
          <p className="adm-card__title">지급 요약</p>
          <div className="adm-sum-row">
            지급 대상<strong>{studentIds.length}명</strong>
          </div>
          <div className="adm-sum-row">
            1인당<strong>{amount.toLocaleString()} NC</strong>
          </div>
          {unknownIds.length > 0 && (
            <div className="adm-sum-row">
              확인 필요한 학번<strong style={{ color: '#8a6410' }}>{unknownIds.length}개</strong>
            </div>
          )}
          <div className="adm-sum-row adm-sum-total">
            총 지급<strong>{total.toLocaleString()} NC</strong>
          </div>

          <div className="adm-preview">
            <p className="adm-preview__label">회원 마이페이지에는 이렇게 보여요</p>
            <div className="adm-preview__row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="adm-preview__title">{reason.trim() || '지급 사유'}</p>
                <p className="adm-preview__date">{formatDate(new Date())}</p>
              </div>
              <span className="adm-preview__amount">+{amount.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            className="adm-btn adm-btn--primary adm-btn--lg adm-btn--block"
            onClick={handleSubmit}
            disabled={loading || studentIds.length === 0}
          >
            {loading ? '지급 중...' : studentIds.length ? `${studentIds.length}명에게 지급하기` : '지급 대상을 입력하세요'}
          </button>
          <p className="adm-help" style={{ textAlign: 'center' }}>
            지급 전에 한 번 더 확인 창이 뜹니다.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default BulkMileagePaymentForm;
