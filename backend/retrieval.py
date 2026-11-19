from pathlib import Path

# 이 파일이 있는 backend 폴더 아래의 data 폴더
DATA_DIR = Path(__file__).resolve().parent / "data"

# 사용자 정의 함수 만들기
def load_chunks():
    chunks = []  # 문단을 담을 빈 목록
    # data 폴더의 TXT 파일을 하나씩 읽습니다.
    for path in sorted(DATA_DIR.glob("*.txt")):
        text = path.read_text(encoding="utf-8")
        # 다음 슬라이드 코드를 이 아래에 이어 씁니다.
        # 빈 줄을 기준으로 문단을 나눕니다.
        for paragraph in text.split("\n\n"):
            paragraph = paragraph.strip()
            if paragraph:  # 비어 있지 않은 문단만 저장
                chunks.append({
                    "source": path.name,  # 원본 파일명
                    "text": paragraph,    # 문단 내용
                })
    return chunks  # 모든 파일의 문단 목록

# 사용자정의 함수 추가
def make_words(text):
    cleaned = text.lower()
    for mark in "?!,./:()-":
        cleaned = cleaned.replace(mark,"")
    return cleaned.split()

# 사용자정의 함수 추가
def find_chunks(question):
    question_words = make_words(question)
    found = []
    for chunk in load_chunks():
        content_words = make_words(chunk["text"])
        # 분문의 문단별로 질문에 매칭되는 단어가 있는지 검색
        for word in question_words:
            if len(word) > 1 and word in content_words:
                found.append(chunk)
                break
        if len(found) == 3:
            break
    return found
