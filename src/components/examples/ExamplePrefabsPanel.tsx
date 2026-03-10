import {
    ActionButtonExample,
    AbilityBarExample,
    CooldownIndicatorExample,
    HUDAnchorExample,
    HUDSlotExample,
    LifeGaugeExample,
    PlatformerHUDPresetExample,
    QuickHUDLayoutExample,
    ToggleExample,
    VirtualActionButtonExample,
    VirtualDPadExample,
    TopDownHUDPresetExample,
    MainMenuExample,
    PauseMenuExample,
    GameOverScreenExample,
    TextBoxExample,
    ToastsExample,
    PrefabExampleMatrixExample,
} from "./index";

const ExamplePrefabsPanel = () => {
    return (
        <aside className="DevControlsTab DevExamplesTab">
            <p className="DevControlsTitle">Example prefabs</p>
            <div className="DevExamplesArea DevExamplesStack">
                <LifeGaugeExample title="LifeGauge preview" />
                <ActionButtonExample title="ActionButton preview" />
                <ToggleExample title="Toggle preview" />
                <VirtualActionButtonExample title="VirtualActionButton preview" />
                <VirtualDPadExample title="VirtualDPad preview" />
                <CooldownIndicatorExample title="CooldownIndicator preview" />
                <AbilityBarExample title="AbilityBar preview" />
                <HUDSlotExample title="HUDSlot preview" />
                <HUDAnchorExample title="HUDAnchor preview" />
                <QuickHUDLayoutExample title="QuickHUDLayout preview" />
                <PlatformerHUDPresetExample title="PlatformerHUDPreset preview" />
                <TopDownHUDPresetExample title="TopDownHUDPreset preview" />
                <MainMenuExample title="MainMenu preview" />
                <PauseMenuExample title="PauseMenu preview" />
                <GameOverScreenExample title="GameOverScreen preview" />
                <TextBoxExample title="TextBox preview" />
                <ToastsExample title="Toasts preview" />
                <PrefabExampleMatrixExample title="Prefab example matrix" />
            </div>
        </aside>
    );
};

export default ExamplePrefabsPanel;
