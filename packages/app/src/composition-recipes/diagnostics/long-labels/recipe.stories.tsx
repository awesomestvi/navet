import { EmptyCard as EmptyCardTemplate } from '@navet/app/composition-recipes/card/empty-card/template';
import { MetricActionRow as MetricActionRowTemplate } from '@navet/app/composition-recipes/card/metric-action-row/template';
import { DashboardGrouping as DashboardGroupingTemplate } from '@navet/app/composition-recipes/dashboard/dashboard-grouping/template';
import { DashboardSection as DashboardSectionTemplate } from '@navet/app/composition-recipes/dashboard/dashboard-section/template';
import { SortableTable as SortableTableTemplate } from '@navet/app/composition-recipes/data/sortable-table/template';
import { CompactDeviceCard as CompactDeviceCardTemplate } from '@navet/app/composition-recipes/devices/compact-device-card/template';
import { StatusFeedback as StatusFeedbackTemplate } from '@navet/app/composition-recipes/feedback/status-feedback/template';
import { SettingsDialog as SettingsDialogTemplate } from '@navet/app/composition-recipes/forms/settings-dialog/template';
import { SettingsField as SettingsFieldTemplate } from '@navet/app/composition-recipes/forms/settings-field/template';
import { SettingsSection as SettingsSectionTemplate } from '@navet/app/composition-recipes/forms/settings-section/template';
import { NavigationWorkspaceRecipe } from '@navet/app/composition-recipes/navigation/navigation-workspace/template';
import { TabsRecipe } from '@navet/app/composition-recipes/navigation/tabs/template';
import { DetailSheet as DetailSheetTemplate } from '@navet/app/composition-recipes/overlays/detail-sheet/template';
import { CheckboxList as CheckboxListTemplate } from '@navet/app/composition-recipes/selection/checkbox-list/template';
import { SearchableSelection as SearchableSelectionTemplate } from '@navet/app/composition-recipes/selection/searchable-selection/template';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import { BaseCard, BodyText, Button } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';

const meta = {
  title: 'Concepts/Composition recipes/Diagnostics/Regression/long-labels',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const longName = 'Lámpara de lectura junto al sofá de la sala de estar';
export const LongLabels: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Caller-owned translated copy across narrow layouts; use all four themes and reduced motion.',
      },
    },
  },
  render: () => (
    <div className="space-y-4">
      <SettingsSectionTemplate
        title="Configuración de los dispositivos de la sala de estar"
        fields={[
          {
            key: 'name',
            label: longName,
            value: longName,
            onValueChange: () => {},
            error: 'El nombre debe ser único dentro de esta habitación',
            required: true,
          },
        ]}
      />
      <SearchableSelectionTemplate
        label="Buscar dispositivos disponibles en esta habitación"
        query=""
        onQueryChange={() => {}}
        options={[{ id: 'lamp', label: longName }]}
        onSelect={() => {}}
        emptyLabel="No hay dispositivos que coincidan con esta búsqueda"
      />
      <CheckboxListTemplate
        label="Dispositivos visibles"
        emptyLabel="Sin dispositivos"
        items={[
          {
            id: 'lamp',
            label: longName,
            checked: true,
            description: 'La selección se guarda en la configuración de esta habitación',
          },
        ]}
        onCheckedChange={() => {}}
      />
      <DashboardSectionTemplate
        title="Dispositivos de la sala de estar y el comedor"
        state="unavailable"
        emptyLabel="Sin dispositivos"
        unavailableLabel="Los dispositivos no están disponibles en este momento"
        action={{ label: 'Actualizar los dispositivos seleccionados', onSelect: () => {} }}
      >
        <BodyText>{longName}</BodyText>
      </DashboardSectionTemplate>
      <DashboardGroupingTemplate
        ariaLabel="Grupos de dispositivos"
        groupingLabel="Agrupar dispositivos por"
        selectedItemId="room"
        selectedModeId="room"
        items={[
          { id: 'room', label: 'Sala de estar y comedor compartidos' },
          { id: 'outside', label: 'Terraza y jardín de la planta baja' },
        ]}
        modes={[{ id: 'room', label: 'Habitación asignada' }]}
        onItemChange={() => {}}
        onModeChange={() => {}}
        renderPanel={() => <BodyText>{longName}</BodyText>}
      />
      <TabsRecipe
        label="Páginas de configuración"
        value="controls"
        onValueChange={() => {}}
        items={[
          {
            id: 'controls',
            label: 'Controles de uso diario',
            content: <BodyText>{longName}</BodyText>,
          },
          { id: 'settings', label: 'Configuración de este dispositivo', content: null },
        ]}
      />
      <NavigationWorkspaceRecipe
        label="Espacio de configuración"
        selectedId="room"
        onSelect={() => {}}
        items={[
          {
            id: 'room',
            label: 'Habitaciones y dispositivos compartidos',
            description: longName,
            content: <BodyText>{longName}</BodyText>,
          },
        ]}
      />
      <SortableTableTemplate
        caption="Dispositivos de esta habitación"
        emptyLabel="No hay dispositivos"
        columns={[
          {
            id: 'name',
            label: 'Nombre del dispositivo seleccionado',
            sortLabel: 'Ordenar por nombre del dispositivo',
          },
        ]}
        rows={[
          {
            id: 'lamp',
            cells: {
              name: { primary: longName, secondary: 'Sala de estar y comedor compartidos' },
            },
          },
        ]}
        onSort={() => {}}
      />
      <StatusFeedbackTemplate
        state="error"
        title="No se han guardado los cambios"
        message="Comprueba la conexión del dispositivo y vuelve a guardar la configuración. Tus cambios se conservan."
      />
      <div className="flex flex-wrap gap-4">
        <EntityCardStoryFrame size="small">
          <CompactDeviceCardTemplate
            id="switch.long_name"
            name={longName}
            size="small"
            initialState={false}
          />
        </EntityCardStoryFrame>
        <EntityCardStoryFrame size="large">
          <EmptyCardTemplate
            size="large"
            title="Sin dispositivos seleccionados"
            description="Elige los dispositivos que quieres mostrar en esta habitación"
          />
        </EntityCardStoryFrame>
        <EntityCardStoryFrame size="medium">
          <BaseCard size="medium" title={longName}>
            <MetricActionRowTemplate
              size="medium"
              value="1.234 W"
              label="Consumo de energía de los dispositivos seleccionados"
              active={false}
              accentClassName="text-current"
              action={{ label: 'Activar dispositivo', onSelect: () => {} }}
            />
          </BaseCard>
        </EntityCardStoryFrame>
      </div>
    </div>
  ),
};
function LongOverlayExample({ sheet = false }: { sheet?: boolean }) {
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const content = (
    <div className="space-y-4">
      <SettingsFieldTemplate
        label={longName}
        value={longName}
        onValueChange={() => {}}
        hint="Nombre utilizado por las personas que comparten esta habitación"
      />
      {Array.from({ length: 12 }, (_, index) => (
        <BodyText key={index}>{longName}</BodyText>
      ))}
    </div>
  );
  return (
    <>
      <Button ref={launcher} onClick={() => setOpen(true)}>
        Open long content
      </Button>
      {sheet ? (
        <DetailSheetTemplate
          isOpen={open}
          onOpenChange={setOpen}
          returnFocusRef={launcher}
          title={longName}
          closeLabel="Cerrar los detalles del dispositivo"
          responsive
        >
          {content}
        </DetailSheetTemplate>
      ) : (
        <SettingsDialogTemplate
          isOpen={open}
          title={longName}
          saveLabel="Guardar la configuración"
          cancelLabel="Cancelar los cambios"
          pending={false}
          canSave={false}
          returnFocusRef={launcher}
          onRequestClose={() => setOpen(false)}
          onSave={() => {}}
        >
          {content}
        </SettingsDialogTemplate>
      )}
    </>
  );
}
export const LongLabelsDialog: Story = { render: () => <LongOverlayExample /> };
export const LongLabelsSheet: Story = { render: () => <LongOverlayExample sheet /> };
