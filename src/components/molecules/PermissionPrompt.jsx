import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Dialog prompting user for microphone permission
 */
function PermissionPrompt({ open, onAllow, permissionStatus }) {
    const isDenied = permissionStatus === 'denied';

    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-md bg-[#101623] border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {isDenied ? 'Microphone Access Denied' : 'Enable Microphone'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        {isDenied ? (
                            <>
                                Microphone access has been denied. Please reset audio permissions
                                in your browser settings and refresh the page to try again.
                            </>
                        ) : (
                            <>
                                <strong>Hey Buddy!</strong> needs access to your microphone to
                                detect wake words. Your audio is processed locally in the browser
                                and is never sent to any server.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>
                {!isDenied && (
                    <DialogFooter>
                        <Button
                            onClick={onAllow}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white"
                        >
                            Allow Microphone Access
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

export { PermissionPrompt };
