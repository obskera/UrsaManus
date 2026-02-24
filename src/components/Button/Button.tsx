import "./Button.css";

export interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

const Button = ({ label, onClick, disabled = false }: ButtonProps) => {
    return (
        <button className=".btn" onClick={onClick} disabled={disabled}>
            {label}
        </button>
    );
};

export default Button;
