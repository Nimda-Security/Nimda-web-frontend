import React, { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import {
  createProfileDecorationAPI,
  deleteProfileDecorationAPI,
  grantProfileDecorationAPI,
  getAdminProfileDecorationsAPI,
  revokeProfileDecorationAPI,
  uploadProfileDecorationImageAPI,
} from '@/api/profileDecorations';
import { Badge, Empty, Loading, PageHeader, confirmDialog } from '../components/AdminUI';

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ProfileDecorationManagement = () => {
  const [decorations, setDecorations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [ownershipSubmitting, setOwnershipSubmitting] = useState(false);
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [file, setFile] = useState(null);
  const [studentNum, setStudentNum] = useState('');
  const [selectedDecorationId, setSelectedDecorationId] = useState('');

  const loadDecorations = async () => {
    setLoading(true);
    const result = await getAdminProfileDecorationsAPI();
    if (result.success) {
      setDecorations(result.decorations);
    } else {
      alert(result.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadDecorations();
  }, []);

  const handleLabelChange = (event) => {
    const nextLabel = event.target.value;
    setLabel(nextLabel);
    if (!key.trim()) {
      setKey(slugify(nextLabel));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!label.trim()) {
      alert('배지 이름을 입력해주세요.');
      return;
    }
    if (!key.trim()) {
      alert('배지 키를 입력해주세요.');
      return;
    }
    if (!file) {
      alert('배지 이미지를 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const upload = await uploadProfileDecorationImageAPI(file);
      if (!upload.ok) {
        alert(upload.message);
        return;
      }

      const created = await createProfileDecorationAPI({
        key: key.trim(),
        label: label.trim(),
        filePath: upload.data.key,
        purchaseRequired: true,
      });
      if (!created.success) {
        alert(created.message);
        return;
      }

      setLabel('');
      setKey('');
      setFile(null);
      form.reset();
      await loadDecorations();
      alert('프로필 배지가 등록되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (decoration) => {
    if (!decoration.id) {
      alert('배지 ID를 찾을 수 없습니다.');
      return;
    }
    const ok = await confirmDialog({
      title: `"${decoration.label}" 배지를 삭제할까요?`,
      message: '삭제한 배지는 되돌릴 수 없습니다.',
      confirmText: '삭제',
      danger: true,
    });
    if (!ok) return;

    setDeletingId(decoration.id);
    try {
      const result = await deleteProfileDecorationAPI(decoration.id);
      if (!result.success) {
        alert(result.message);
        return;
      }
      setDecorations((prev) => prev.filter((item) => item.id !== decoration.id));
      alert(result.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOwnershipSubmit = async (mode) => {
    const trimmedStudentNum = studentNum.trim();
    const decorationId = Number(selectedDecorationId);
    if (!trimmedStudentNum) {
      alert('학번을 입력해주세요.');
      return;
    }
    if (!decorationId) {
      alert('배지를 선택해주세요.');
      return;
    }

    setOwnershipSubmitting(true);
    try {
      const result =
        mode === 'grant'
          ? await grantProfileDecorationAPI({ studentNum: trimmedStudentNum, decorationId })
          : await revokeProfileDecorationAPI({ studentNum: trimmedStudentNum, decorationId });
      alert(result.message);
      if (result.success) {
        setStudentNum('');
      }
    } finally {
      setOwnershipSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="프로필 배지" description="프로필 배지를 등록하고, 학번으로 회원에게 지급하거나 회수합니다." />

      <div className="adm-grid-2" style={{ alignItems: 'start' }}>
        <form onSubmit={handleSubmit} className="adm-card">
          <div className="adm-card__body adm-form">
            <div>
              <p className="adm-card__title">배지 등록</p>
              <p className="adm-card__desc">등록한 배지는 지급하거나 구매해야 쓸 수 있습니다.</p>
            </div>
            <label className="adm-field">
              <span className="adm-label">배지 이름</span>
              <input type="text" value={label} onChange={handleLabelChange} className="adm-input" placeholder="예: 체크 배지" />
            </label>
            <label className="adm-field">
              <span className="adm-label">배지 키</span>
              <input
                type="text"
                value={key}
                onChange={(event) => setKey(slugify(event.target.value))}
                className="adm-input"
                placeholder="예: check-badge"
              />
              <span className="adm-help">영문 소문자·숫자·하이픈. 이름을 쓰면 자동으로 채워집니다.</span>
            </label>
            <label className="adm-field">
              <span className="adm-label">배지 이미지</span>
              <input
                type="file"
                accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="adm-input"
                style={{ paddingTop: 7 }}
              />
              <span className="adm-help">SVG · PNG · JPG · WEBP</span>
            </label>
            <div className="adm-form__actions">
              <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
                {saving ? '등록 중...' : '배지 등록'}
              </button>
            </div>
          </div>
        </form>

        <div className="adm-card">
          <div className="adm-card__body adm-form">
            <div>
              <p className="adm-card__title">배지 지급 · 회수</p>
              <p className="adm-card__desc">학번과 배지를 골라 특정 회원에게 지급하거나 회수합니다.</p>
            </div>
            <label className="adm-field">
              <span className="adm-label">학번</span>
              <input
                type="text"
                value={studentNum}
                onChange={(event) => setStudentNum(event.target.value)}
                className="adm-input"
                placeholder="예: 202400001"
              />
            </label>
            <label className="adm-field">
              <span className="adm-label">배지</span>
              <select value={selectedDecorationId} onChange={(event) => setSelectedDecorationId(event.target.value)} className="adm-select">
                <option value="">배지를 선택하세요</option>
                {decorations.map((decoration) => (
                  <option key={decoration.id ?? decoration.key} value={decoration.id}>
                    {decoration.label} ({decoration.key})
                  </option>
                ))}
              </select>
            </label>
            <div className="adm-form__actions">
              <button
                type="button"
                className="adm-btn adm-btn--danger"
                disabled={ownershipSubmitting}
                onClick={() => handleOwnershipSubmit('revoke')}
              >
                회수
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                disabled={ownershipSubmitting}
                onClick={() => handleOwnershipSubmit('grant')}
              >
                지급
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-toolbar" style={{ borderBottom: '1px solid #ececec' }}>
          <span className="adm-card__title">등록된 배지</span>
          <Badge>{decorations.length}</Badge>
        </div>
        {loading ? (
          <Loading />
        ) : decorations.length === 0 ? (
          <Empty icon={<Award size={22} />} title="등록된 배지가 없습니다" />
        ) : (
          <div className="adm-card__body">
            <div className="adm-deco-grid">
              {decorations.map((decoration) => (
                <div key={decoration.key} className="adm-deco">
                  <img src={decoration.src} alt={decoration.label} />
                  <p className="adm-deco__label">{decoration.label}</p>
                  <p className="adm-deco__key">{decoration.key}</p>
                  <button
                    type="button"
                    onClick={() => handleDelete(decoration)}
                    disabled={deletingId === decoration.id}
                    className="adm-btn adm-btn--danger adm-btn--sm adm-btn--block"
                  >
                    {deletingId === decoration.id ? '삭제 중' : '삭제'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProfileDecorationManagement;
