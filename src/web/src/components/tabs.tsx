import React from 'react';

export type Tab = {
    name: string;
    icon: React.ReactNode;
};

export const TabHeaders: React.FC<{
    tabs: Array<Tab>,
    activeTab: string,
    onChangeTab: (tab: string) => void,
}> = ({
    tabs,
    activeTab,
    onChangeTab,
}) => {
    return (
        <div className="tabs-header">
            {tabs.map((tab) => (
                <TabHeader
                    key={tab.name}
                    tab={tab}
                    activeTab={activeTab}
                    onChangeTab={onChangeTab}
                />
            ))}
        </div>
    );
};

const TabHeader: React.FC<{
    tab: Tab,
    activeTab: string,
    onChangeTab: (tab: string) => void,
}> = ({
    tab,
    activeTab,
    onChangeTab,
}) => {
    const isSelected = tab.name === activeTab;
    return (
        <div
            className={`tab-title ${isSelected ? "selected" : ""}`}
            onClick={() => onChangeTab(tab.name)}
        >
            {tab.icon}
        </div>
    );
};
