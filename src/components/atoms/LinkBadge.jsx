import { Badge } from '@/components/ui/badge';

/**
 * External link badge with icon
 */
function LinkBadge({ href, icon, label, alt }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
            <Badge variant="secondary" className="h-5 gap-1 bg-[#0b1830] hover:bg-[#1a2949] text-white border-0">
                <img src={icon} alt={alt} className="h-3.5 w-3.5" />
                <span>{label}</span>
            </Badge>
        </a>
    );
}

export { LinkBadge };
