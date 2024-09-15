import React from 'react';

export const TabHeader: React.FC<{
    tab: string;
    icon: React.ReactNode;
    activeTab: string;
    onChangeTab: (tab: string) => void;
}> = ({
    tab,
    icon,
    activeTab,
    onChangeTab,
}) => {
    const isSelected = tab === activeTab;
    return (
        <div
            className={`tab-title ${isSelected ? "selected" : ""}`}
            onClick={() => onChangeTab(tab)}
        >
            {icon}
        </div>
    );
};
