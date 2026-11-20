"""Supabase가 허용한 현재 사용자의 문서에서 문단을 검색합니다."""


def load_chunks(documents):
    chunks = []
    for document in documents:
        for paragraph in document["content"].split("\n\n"):
            paragraph = paragraph.strip()
            if paragraph:
                chunks.append(
                    {"source": document["filename"], "text": paragraph}
                )
    return chunks


def make_words(text):
    cleaned = text.lower()
    for mark in "?!,./:()-_*[]{}":
        cleaned = cleaned.replace(mark, " ")

    # 질문의 조사와 요청 표현을 빼고 검색할 핵심 단어만 남깁니다.
    common_words = (
        "대해", "설명해줘", "알려줘", "정리해줘", "무엇인가요",
        "한문장으로", "쉽게", "자세히", "어떻게", "무엇",
    )
    words = []
    for word in cleaned.split():
        for ending in ("이란", "인가요", "에서", "으로", "을", "를", "은", "는", "에", "이", "가"):
            if word.endswith(ending) and len(word) > len(ending) + 1:
                word = word[:-len(ending)]
                break
        if len(word) > 1 and word not in common_words:
            words.append(word)
    return words


def find_chunks(question, documents):
    question_words = make_words(question)
    scored = []
    for chunk in load_chunks(documents):
        content_words = make_words(chunk["text"])
        filename_words = make_words(chunk["source"])
        score = 0
        for word in question_words:
            if len(word) > 1 and word in content_words:
                score += 2
            if word in filename_words:
                score += 3
        if score > 0:
            scored.append({"score": score, "chunk": chunk})

    # 점수가 높은 문단 세 개를 고릅니다. 같은 점수라면 문서 순서를 유지합니다.
    found = []
    while scored and len(found) < 3:
        best_index = 0
        for index in range(1, len(scored)):
            if scored[index]["score"] > scored[best_index]["score"]:
                best_index = index
        found.append(scored.pop(best_index)["chunk"])
    return found

