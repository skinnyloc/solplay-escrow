interface GameResultModalProps {
  isWinner: boolean;
  amount: number;
  signature: string;
  onClose: () => void;
}

export function GameResultModal({ isWinner, amount, signature, onClose }: GameResultModalProps) {
  const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4">
            {isWinner ? '🎉' : '😔'}
          </div>

          <h2 className="text-3xl font-bold mb-2">
            {isWinner ? 'You Won!' : 'You Lost'}
          </h2>

          <div className={`text-4xl font-bold mb-6 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
            {isWinner ? '+' : '-'}{amount.toFixed(4)} SOL
          </div>

          {isWinner && (
            <p className="text-sm text-gray-400 mb-4">
              💰 Payout sent to your wallet!
            </p>
          )}

          <a
            href={solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mb-6 text-teal-400 hover:underline text-sm"
          >
            View transaction on Solscan →
          </a>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded font-bold"
            >
              Back to Lobby
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 rounded font-bold"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
