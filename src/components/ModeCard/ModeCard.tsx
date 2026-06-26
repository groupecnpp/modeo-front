import type { Draft } from "../../services/storage";
import defaultImg from "../../assets/defaultImg.png";
import { formatRelativeDate } from "../../services/date";
import "./ModeCard.css";
import { Link } from "react-router";
import { BsThreeDots } from "react-icons/bs";
import { useEffect, useRef, useState } from "react";
import ConfirmModal from "../ConfirmModal/ConfirmModal";
import { GoStar, GoStarFill } from "react-icons/go";
import { AiOutlineLoading } from "react-icons/ai";

function ModeCard({
    mode,
    deleteMode,
    deleteLoading,
    onToggleFavorite,
}: {
    mode: Draft;
    deleteMode: (id: string) => void;
    deleteLoading: boolean;
    onToggleFavorite: (id: string) => Promise<void>;
}) {
    const overlayLinkRef = useRef<HTMLAnchorElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuIconRef = useRef<HTMLDivElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    const addLinkOpacity = () => {
        overlayLinkRef.current?.classList.add("overlay-link-opacity");
    };
    const removeLinkOpacity = () => {
        overlayLinkRef.current?.classList.remove("overlay-link-opacity");
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                menuIconRef.current &&
                !menuIconRef.current.contains(event.target as Node)
            ) {
                setMenuOpen(false);
            }
        };

        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    const handleDelete = () => {
        deleteMode(mode.id);
    };

    const toggleFavorite = async () => {
        if (!favoriteLoading) {
            setFavoriteLoading(true);
            try {
                await onToggleFavorite(mode.id);
            } finally {
                setFavoriteLoading(false);
            }
        }
    };

    return (
        <div className="mo-card">
            <div className="mo-card__img-container">
                <div
                    className={"mo-card__favorite-icon-container" + (mode.isFavorite ? " mo-card__is-favorite" : "")}
                    onMouseEnter={addLinkOpacity}
                    onMouseLeave={removeLinkOpacity}
                    onClick={toggleFavorite}>
                    {favoriteLoading ? (
                        <AiOutlineLoading className="mo-card__loading-icon" />
                    ) : mode.isFavorite ? (
                        <GoStarFill className="mo-card__favorite-icon" color="#f5c518" />
                    ) : (
                        <GoStar className="mo-card__favorite-icon" color="var(--color-text)" />
                    )}
                </div>
                <img src={mode.steps?.[0]?.capture || defaultImg} />
                <div className="mo-card__hover-text">
                    {mode.steps?.length || 0} étape{(mode.steps?.length || 0) > 1 ? "s" : ""}
                </div>
            </div>
            <div className="mo-card__card-body">
                <div className="mo-card__card-title">{mode.title || "Sans titre"}</div>
                <div className="mo-card__card-bottom">
                    <div className="mo-card__card-date">{formatRelativeDate(new Date(mode.createdAt))}</div>
                    <div
                        onMouseEnter={addLinkOpacity}
                        onMouseLeave={removeLinkOpacity}
                        style={{ position: "relative" }}>
                        {menuOpen && (
                            <div className="mo-card__menu" ref={menuRef}>
                                {/* <div className="mo-card__menu-item">Menu item</div> */}
                                {/* <div className="mo-card__menu-item">Menu item</div> */}
                                <div
                                    className="mo-card__menu-item"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setConfirmDeleteOpen(true);
                                    }}>
                                    Supprimer
                                </div>
                            </div>
                        )}
                        <div className="mo-card__menu-icon" onClick={() => setMenuOpen(!menuOpen)} ref={menuIconRef}>
                            <BsThreeDots />
                        </div>
                    </div>
                </div>
                <Link to={`/drafts/${mode.id}`} ref={overlayLinkRef} className="mo-card__overlay-link" />
            </div>

            <ConfirmModal
                isOpen={confirmDeleteOpen}
                title="Confirmer la suppression"
                message="Êtes-vous sûr(e) de vouloir supprimer ce mode opératoire ?"
                confirmLabel="Supprimer"
                cancelLabel="Annuler"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDeleteOpen(false)}
                loading={deleteLoading}
            />
        </div>
    );
}
export default ModeCard;
