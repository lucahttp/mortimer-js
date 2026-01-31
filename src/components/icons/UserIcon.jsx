export default function UserIcon(props) {
    return (
        <div className="flex h-8 w-8 min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white shadow-md">
            <svg
                {...props}
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 256 256"
            >
                <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM80,104a48,48,0,1,1,48,48A48.05,48.05,0,0,1,80,104Z"></path>
            </svg>
        </div>
    );
}
