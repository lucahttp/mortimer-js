export default function BotIcon(props) {
    return (
        <div className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
            <svg
                {...props}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 256 256"
            >
                <path d="M208,40H48A16,16,0,0,0,32,56V200a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Zm-24,80H72a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16Zm0,32H72a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16Z"></path>
            </svg>
        </div>
    );
}
