import PollList from './PollList.jsx';

// Poll 一覧ページ
function PollListPage({ signer, onSelect, onCreate }) {
    return (
        <div className="flex flex-col gap-4 mt-4">
            <div className="flex gap-2">
                <button
                    className="px-4 py-2 rounded-xl bg-green-600 text-white"
                    onClick={onCreate}
                >
                    新規作成
                </button>
            </div>
            <PollList signer={signer} onSelect={onSelect} />
        </div>
    );
}

export default PollListPage;
