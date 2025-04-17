import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from '../../styles/AuthPage.module.css';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import { uploadImageToStorage } from '../../lib/api';
import ConfirmModal from '../../components/ConfirmModal';

// 이미지 편집 모달 컴포넌트
const ImageEditorModal = ({
  isOpen,
  onClose,
  image,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  onSave: (croppedImage: string) => void;
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [imgPosition, setImgPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 이미지 로드 시 상태 초기화
  useEffect(() => {
    if (image && isOpen) {
      setImgSrc(image);
      setIsLoading(true);
      setScale(1);
      setRotate(0);
      setImgPosition({ x: 0, y: 0 });
    } else {
      setImgSrc(null);
    }
  }, [image, isOpen]);

  // 이미지 로드 완료 시 처리
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // 마우스/터치 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imgPosition.x,
      y: e.clientY - imgPosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setImgPosition({
      x: newX,
      y: newY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 줌 변경 핸들러
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(parseFloat(e.target.value));
  };

  const decreaseZoom = () => {
    setScale(prev => Math.max(0.05, prev - 0.01));
  };

  const increaseZoom = () => {
    setScale(prev => Math.min(5, prev + 0.01));
  };

  // 회전 핸들러
  const rotateLeft = () => {
    setRotate(prev => prev - 90);
  };

  const rotateRight = () => {
    setRotate(prev => prev + 90);
  };

  // 이미지 리셋
  const resetImage = () => {
    setScale(1);
    setRotate(0);
    setImgPosition({ x: 0, y: 0 });
  };

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({
      x: touch.clientX - imgPosition.x,
      y: touch.clientY - imgPosition.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    setImgPosition({
      x: newX,
      y: newY
    });
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // 이미지 크롭 및 저장
  const saveCroppedImage = async () => {
    if (!imageRef.current) return;

    try {
      setIsSaving(true);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 캔버스 크기 설정 (프로필 이미지는 200x200)
      canvas.width = 200;
      canvas.height = 200;
      
      if (!ctx) return;
      
      // 캔버스 초기화 (배경 투명하게)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 배경색 설정 (검정 배경)
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 중앙 정렬 및 회전
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      
      // 이미지 그리기
      const img = imageRef.current;
      const scaledWidth = img.naturalWidth * scale;
      const scaledHeight = img.naturalHeight * scale;
      
      ctx.drawImage(
        img,
        -scaledWidth / 2 + imgPosition.x,
        -scaledHeight / 2 + imgPosition.y,
        scaledWidth,
        scaledHeight
      );
      
      ctx.restore();
      
      // 결과 이미지 생성
      const resultImage = canvas.toDataURL('image/png', 0.9);
      
      // 이미지 저장 함수 호출
      onSave(resultImage);
      onClose();
      
    } catch (error) {
      console.error('이미지 저장 중 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 모달이 열릴 때 body 스크롤 막기
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  if (!isOpen || !imgSrc) return null;

  return (
    <div 
      className={styles['modal-overlay']}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className={styles['modal-content']}>
        <div 
          className={styles['crop-container']} 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            height: '500px', 
            maxHeight: '90vh',
            backgroundColor: '#121212' 
          }}
        >
          {isLoading && <div className={styles.loading}>이미지 로딩 중...</div>}
          <div className={styles['crop-preview']}>
            <img
              ref={imageRef}
              src={imgSrc}
              onLoad={handleImageLoad}
              onMouseDown={handleMouseDown}
              onTouchStart={() => setIsDragging(true)}
              style={{
                transform: `translate(${imgPosition.x}px, ${imgPosition.y}px) scale(${scale}) rotate(${rotate}deg)`,
                transformOrigin: 'center',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
                WebkitUserSelect: 'none',
                objectFit: 'none'
              }}
              alt="Crop preview"
              draggable={false}
            />
          </div>
          
          {!isLoading && <div className={styles['crop-overlay']}>
            <div 
              className={styles['crop-frame']} 
              style={{
                width: '200px',
                height: '200px',
                aspectRatio: '1',
                maxWidth: '200px',
                maxHeight: '200px',
                margin: 0,
                padding: 0,
                border: '2px dashed #3a8eff'
              }}
            ></div>
          </div>}
        </div>

        <div className={styles['cropper-controls']}>
          <div className={styles['crop-control-group']}>
            <button 
              className={styles['crop-control-button']} 
              onClick={rotateLeft} 
              disabled={isLoading}
              title="왼쪽으로 회전"
            >
              ↺
            </button>
            <button 
              className={styles['crop-control-button']} 
              onClick={rotateRight} 
              disabled={isLoading}
              title="오른쪽으로 회전"
            >
              ↻
            </button>
            <button 
              className={styles['crop-control-button']} 
              onClick={resetImage} 
              disabled={isLoading}
              title="초기화"
            >
              ↺↻
            </button>
          </div>

          <div className={styles['crop-control-group']}>
            <button 
              className={styles['crop-control-button']} 
              onClick={decreaseZoom}
              disabled={isLoading || scale <= 0.05}
              title="축소"
            >
              -
            </button>
            
            <input
              type="range"
              value={scale}
              min={0.05}
              max={5}
              step={0.01}
              className={styles['zoom-slider']}
              disabled={isLoading}
              onChange={handleZoomChange}
            />
            
            <button 
              className={styles['crop-control-button']} 
              onClick={increaseZoom}
              disabled={isLoading || scale >= 5}
              title="확대"
            >
              +
            </button>
          </div>
        </div>

        <div className={styles['modal-buttons']}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className={styles['cancel-button']}
            type="button"
          >
            취소
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              saveCroppedImage();
            }} 
            className={styles['save-button']}
            disabled={isLoading || isSaving}
            type="button"
          >
            {isSaving ? '처리 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 관심분야 옵션
const interestOptions = [
  { id: 'politics', label: '정치' },
  { id: 'society', label: '사회' },
  { id: 'technology', label: '기술' },
  { id: 'culture', label: '문화' },
  { id: 'sports', label: '스포츠' },
  { id: 'food', label: '음식' },
  { id: 'learning', label: '학습' },
  { id: 'automotive', label: '자동차' },
  { id: 'fashion', label: '패션' },
  { id: 'art', label: '예술' },
  { id: 'music', label: '음악' },
  { id: 'realestate', label: '부동산' }
];

const SignupPage: React.FC = () => {
  const location = useLocation();
  const { userInfo } = location.state || {};

  // isEditMode 상태 추가
  const isEditMode = !!userInfo;
  
  // 이메일 입력 필드 참조 생성
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState('');
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [region, setRegion] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [genderError, setGenderError] = useState<string | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null);
  const [interestsError, setInterestsError] = useState<string | null>(null);
  
  // 성공 모달 상태 추가
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  // 편집 모드일 때 사용자 데이터 불러오기
  useEffect(() => {
    if (isEditMode && userInfo) {
      setEmail(userInfo.email || '');
      setUsername(userInfo.username || '');
      setProfileImage(userInfo.profile_Image || '');
      setGender(userInfo.gender || '');
      setBirthYear(userInfo.birthyear?.toString() || '');
      setRegion(userInfo.region || '');
      setPhoneNumber(userInfo.phone_number || '');
      setInterests(userInfo.interests?.split(',') || []);
    }

    // 컴포넌트가 마운트되면 이메일 입력 필드에 포커스
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [isEditMode, userInfo]);

  // 이미지 선택 핸들러
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 이미지 유형 확인
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있습니다.');
      return;
    }
    
    // 이미지 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('이미지 크기는 10MB 이하여야 합니다.');
      return;
    }
    
    // 에러 메시지 초기화
    setError(null);
    
    try {
      // 파일을 Base64로 변환
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          // 이미지 처리
          if (typeof reader.result === 'string') {
            // 이미지 데이터를 에디터에 전달
            setImageSrc(reader.result);
            setShowImageEditor(true);
          }
        } catch (err) {
          console.error('이미지 로드 중 오류:', err);
          setError('이미지를 로드하는 중 오류가 발생했습니다.');
        }
      };
      
      reader.onerror = () => {
        setError('파일을 읽는 중 오류가 발생했습니다.');
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('이미지 처리 중 오류:', err);
      setError('이미지를 처리하는 중 오류가 발생했습니다.');
    }
  };

  // 이미지 에디터 닫기
  const closeImageEditor = () => {
    setShowImageEditor(false);
    setImageSrc(null);
  };

  // 이미 로그인된 경우 메인 페이지로 리다이렉트
  useEffect(() => {
    if (user && !isEditMode) {
      console.log('SignupPage: 이미 로그인된 사용자, 메인 페이지로 리다이렉트', user);
      try {
        navigate('/');
      } catch (error) {
        console.error('SignupPage: 리다이렉트 오류', error);
      }
    }
  }, [user, navigate, isEditMode]);

  // 관심분야 토글 핸들러
  const toggleInterest = (interestId: string) => {
    setInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else {
        return [...prev, interestId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('회원가입 버튼 클릭됨');
    
    // 에러 상태 초기화
    setEmailError(null);
    setPasswordError(null);
    setUsernameError(null);
    setGenderError(null);
    setRegionError(null);
    setPhoneNumberError(null);
    setInterestsError(null);
    
    // 이메일 유효성 검사
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('유효한 이메일 주소를 입력해주세요.');
      return;
    }
    
    // 편집 모드가 아닐 때만 비밀번호 유효성 검사 수행
    if (!isEditMode) {
      // 비밀번호 유효성 검사
      if (password.length < 6) {
        setPasswordError('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }
      
      // 비밀번호 확인 검증
      if (password !== confirmPassword) {
        setPasswordError('비밀번호가 일치하지 않습니다.');
        return;
      }
    } else if (password && password !== confirmPassword) {
      // 편집 모드에서 비밀번호를 입력한 경우
      setPasswordError('비밀번호가 일치하지 않습니다.');
      return;
    }
    
    // 사용자 이름 유효성 검사
    if (username.length < 2) {
      setUsernameError('사용자 이름은 최소 2자 이상이어야 합니다.');
      return;
    }
    
    // 성별 검증
    if (!gender) {
      setGenderError('성별을 선택해주세요');
      return;
    }
    
    // 지역 검증
    if (!region) {
      setRegionError('지역을 선택해주세요');
      return;
    }
    
    // 휴대폰 번호 검증
    if (!phoneNumber) {
      setPhoneNumberError('휴대폰 번호를 입력해주세요');
      return;
    }
    
    // 관심 분야 검증
    if (interests.length === 0) {
      setInterestsError('관심 분야를 선택해주세요');
      return;
    }
    
    // 회원가입 처리
    setLoading(true);
    
    console.log('SignupPage: 폼 제출됨', { 
      email, 
      username, 
      gender, 
      birthYear, 
      region, 
      phoneNumber, 
      interests 
    });
    
    try {
      console.log('SignupPage: 회원가입 시도 중...');
      
      if (isEditMode) {
        // 프로필 편집 모드
        const updateData: any = {
          username,
          profile_Image: profileImage,
          gender,
          birthyear: parseInt(birthYear),
          region,
          phone_number: phoneNumber || null,
          interests: interests.join(',')
        };

        // 새 비밀번호가 입력된 경우에만 업데이트
        if (password) {
          updateData.password = password;
        }

        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userInfo.id);

        if (updateError) {
          console.error('SignupPage: 사용자 정보 업데이트 실패', updateError);
          setError('사용자 정보 업데이트에 실패했습니다: ' + updateError.message);
          setLoading(false);
          return;
        }

        // 성공 메시지 설정 및 모달 표시
        setSuccessMessage('프로필이 성공적으로 업데이트되었습니다.');
        setShowSuccessModal(true);
      } else {
        // 1. 이메일 중복 체크
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();  // single 대신 maybeSingle 사용
        
        if (checkError) {
          console.error('SignupPage: 이메일 중복 체크 오류', checkError);
          setError('이메일 중복 확인 중 오류가 발생했습니다: ' + checkError.message);
          setLoading(false);
          return;
        }
        
        if (existingUser) {
          console.error('SignupPage: 이메일 중복', existingUser);
          setEmailError('이미 사용 중인 이메일 주소입니다.');
          setLoading(false);
          return;
        }
        
        // 2. 사용자 이름 중복 체크 추가
        const { data: existingUsername, error: usernameCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .maybeSingle();
          
        if (usernameCheckError) {
          console.error('SignupPage: 사용자 이름 중복 체크 오류', usernameCheckError);
          setError('사용자 이름 중복 확인 중 오류가 발생했습니다: ' + usernameCheckError.message);
          setLoading(false);
          return;
        }
        
        if (existingUsername) {
          console.error('SignupPage: 사용자 이름 중복', existingUsername);
          setUsernameError('이미 사용 중인 사용자 이름입니다.');
          setLoading(false);
          return;
        }
        
        // 3. Supabase Auth로 회원가입
        console.log('signUp 함수 호출 전:', { email, password });
        
        // 직접 signUp 함수 호출
        const { error: signUpError, data: authData } = await signUp(email, password);
        
        console.log('signUp 함수 호출 후:', { signUpError, authData });
        
        if (signUpError) {
          console.error('SignupPage: 회원가입 에러', signUpError);
          
          // Supabase 오류 메시지 처리
          if (signUpError.message?.includes('이미 사용 중인 이메일')) {
            setEmailError('이미 사용 중인 이메일 주소입니다.');
          } else if (signUpError.message?.includes('Password')) {
            setPasswordError('비밀번호 형식이 올바르지 않습니다.');
          } else if (signUpError.message?.includes('email rate limit exceeded')) {
            setError('이메일 인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
          } else if (signUpError.code === '23505' && signUpError.message?.includes('users_username_key')) {
            // 사용자 이름 중복 오류 추가 처리
            setUsernameError('이미 사용 중인 사용자 이름입니다.');
          } else {
            setError(signUpError.message || '회원가입에 실패했습니다.');
          }
          
          setLoading(false);
          return;
        }
        
        console.log('SignupPage: 회원가입 성공', authData);
        
        // 2. 프로필 이미지 업로드 (있는 경우)
        let profileImageUrl = null;
        if (profileImage) {
          try {
            profileImageUrl = await uploadImageToStorage(profileImage);
            console.log('SignupPage: 프로필 이미지 업로드 성공', profileImageUrl);
          } catch (uploadError) {
            console.error('SignupPage: 프로필 이미지 업로드 실패', uploadError);
            // 이미지 업로드 실패해도 계속 진행
          }
        }
        
        // 새 사용자 ID 확인
        if (!authData?.id) {
          console.error('SignupPage: 사용자 ID를 받지 못했습니다');
          setError('회원가입 처리 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }
        
        // 4. users 테이블에 사용자 정보 업데이트
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: username,
            profile_Image: profileImageUrl,
            gender: gender,
            birthyear: parseInt(birthYear),
            region: region,
            phone_number: phoneNumber || null,
            interests: interests.join(','),
            updated_at: [now]  // 배열로 변경
          })
          .eq('id', authData.id);
        
        if (updateError) {
          console.error('SignupPage: 사용자 정보 업데이트 실패', updateError);
          setError('사용자 정보 저장에 실패했습니다: ' + updateError.message);
          setLoading(false);
          return;
        }
        
        console.log('SignupPage: 사용자 정보 저장 성공');
        
        // 성공 메시지 설정 및 모달 표시
        setSuccessMessage('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('SignupPage: 예외 발생', err);
      setError('알 수 없는 오류가 발생했습니다. 개발자 도구의 콘솔을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 성공 모달 확인 버튼 처리 함수
  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
    if (isEditMode) {
      navigate('/mypage');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        <h2>{isEditMode ? '프로필 편집' : '회원 가입'}</h2>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {loading && <div className={styles.loading}>처리 중...</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">이메일 *</label>
            <input
              ref={emailInputRef}
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                // 이메일 입력 처리 간소화
                setEmail(e.target.value);
              }}
              onFocus={() => setEmailError(null)}
              required
              className={`${styles.input} ${emailError ? styles.inputError : ''}`}
              placeholder="이메일을 입력하세요"
              autoFocus
            />
            {emailError && <div className={styles.errorMessage}>{emailError}</div>}
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password">
              {isEditMode ? '새 비밀번호' : '비밀번호 *'}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordError(null)}
              required={!isEditMode}
              className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
              placeholder={isEditMode ? '새 비밀번호를 입력하세요' : '비밀번호를 입력하세요'}
            />
            {passwordError && <div className={styles.errorMessage}>{passwordError}</div>}
            {isEditMode && (
              <div className={styles.infoMessage}>
                비밀번호 변경을 원하면 새 비밀번호를 입력하세요.
              </div>
            )}
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">
              {isEditMode ? '새 비밀번호 확인' : '비밀번호 확인 *'} 
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setPasswordError(null)}
              required={!isEditMode}
              className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
              placeholder={isEditMode ? '새 비밀번호를 다시 입력하세요' : '비밀번호를 다시 입력하세요'}
            />
            {passwordError && <div className={styles.errorMessage}>{passwordError}</div>}
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="username">사용자 이름 *</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setUsernameError(null)}
              required
              className={`${styles.input} ${usernameError ? styles.inputError : ''}`}
              placeholder="사용자 이름을 입력하세요"
            />
            {usernameError && <div className={styles.errorMessage}>{usernameError}</div>}
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="profileImage">프로필 이미지</label>
            <div className={styles.profileImageContainer}>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                id="profile-image-input"
                onChange={handleImageSelect}
              />
              {profileImage ? (
                <div className={styles.profileImagePreview}>
                  <img 
                    src={profileImage} 
                    alt="프로필 이미지" 
                    className={styles.profileImage}
                  />
                  <div className={styles.imageControls}>
                    <button
                      type="button"
                      className={styles.imageButton}
                      onClick={() => {
                        const fileInput = document.getElementById('profile-image-input') as HTMLInputElement;
                        fileInput?.click();
                      }}
                    >
                      변경
                    </button>
                    <button
                      type="button"
                      className={styles.imageButton}
                      onClick={() => setProfileImage('')}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.profileImagePlaceholder}>
                  <button
                    type="button"
                    className={styles.imageButton}
                    onClick={() => {
                      const fileInput = document.getElementById('profile-image-input') as HTMLInputElement;
                      fileInput?.click();
                    }}
                  >
                    이미지 선택
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className={styles.inputGroup}>
            <label>성별 *</label>
            <div className={styles.genderButtonGroup}>
              <button
                type="button"
                className={`${styles.genderButton} ${gender === 'male' ? styles.selected : ''}`}
                onClick={() => setGender('male')}
              >
                남성
              </button>
              <button
                type="button"
                className={`${styles.genderButton} ${gender === 'female' ? styles.selected : ''}`}
                onClick={() => setGender('female')}
              >
                여성
              </button>
            </div>
            {genderError && <div className={styles.errorMessage}>{genderError}</div>}
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="birthYear">출생년도 *</label>
            <select
              id="birthYear"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              required
              className={styles.input}
            >
              <option value="">선택하세요</option>
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="region">사는지역 *</label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              className={`${styles.input} ${regionError ? styles.inputError : ''}`}
            >
              <option value="">선택하세요</option>
              <option value="seoul">서울</option>
              <option value="busan">부산</option>
              <option value="incheon">인천</option>
              <option value="daegu">대구</option>
              <option value="daejeon">대전</option>
              <option value="gwangju">광주</option>
              <option value="suwon">수원</option>
              <option value="sejong">세종</option>
              <option value="gyeonggi">경기도</option>
              <option value="gangwon">강원도</option>
              <option value="chungbuk">충청북도</option>
              <option value="chungnam">충청남도</option>
              <option value="jeonbuk">전라북도</option>
              <option value="jeonnam">전라남도</option>
              <option value="gyeongbuk">경상북도</option>
              <option value="gyeongnam">경상남도</option>
              <option value="jeju">제주도</option>
              <option value="other">기타</option>
            </select>
            {regionError && <div className={styles.errorMessage}>{regionError}</div>}
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="phoneNumber">휴대폰번호 *</label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={`${styles.input} ${phoneNumberError ? styles.inputError : ''}`}
              placeholder="휴대폰번호를 입력하세요"
            />
            {phoneNumberError && <div className={styles.errorMessage}>{phoneNumberError}</div>}
          </div>
          
          <div className={styles.inputGroup}>
            <label>관심분야 *</label>
            <div className={`${styles.interestsContainer} ${interestsError ? styles.inputError : ''}`}>
              {interestOptions.map(option => (
                <div 
                  key={option.id} 
                  className={`${styles.interestOption} ${interests.includes(option.id) ? styles.selected : ''}`}
                  onClick={() => toggleInterest(option.id)}
                >
                  {option.label}
                </div>
              ))}
            </div>
            {interestsError && <div className={styles.errorMessage}>{interestsError}</div>}
          </div>
          
          <div className={styles.divider}></div>
          
          <div className={styles.buttonGroup}>
            {isEditMode && (
              <button 
                type="button" 
                className={styles.cancelButton}
                onClick={() => navigate('/mypage')}
              >
                취소
              </button>
            )}
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? '처리 중...' : isEditMode ? '프로필 업데이트' : '회원가입'}
            </button>
          </div>
        </form>
        
        {/* 회원가입 모드일 때만 보이는 전환 버튼 */}
        {!isEditMode && (
          <div className={styles.switchMode}>
            <p className={styles.switchText}>이미 계정이 있으신가요?</p>
            <button 
              onClick={() => navigate('/auth')}
              className={styles.switchButton}
            >
              로그인
            </button>
          </div>
        )}
      </div>
      
      {/* 이미지 에디터 모달 */}
      <ImageEditorModal
        isOpen={showImageEditor}
        onClose={closeImageEditor}
        image={imageSrc}
        onSave={(croppedImage) => {
          setProfileImage(croppedImage);
          closeImageEditor();
        }}
      />

      {/* 성공 모달 추가 */}
      <ConfirmModal
        isOpen={showSuccessModal}
        onClose={() => handleSuccessConfirm()}
        onConfirm={handleSuccessConfirm}
        title={isEditMode ? "프로필 업데이트 완료" : "회원가입 성공"}
        message={successMessage}
        confirmButtonText="확인"
        confirmButtonVariant="primary"
        cancelButtonText=""
      />
    </div>
  );
};

export default SignupPage; 