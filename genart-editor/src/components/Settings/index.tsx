import React from 'react'
import {
  useSettings,
  Button as SettingsButton,
  Entry,
} from '../../SettingsProvider'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Checkbox,
  FormLabel,
  Typography,
  TextField,
  Button,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'

export function Settings() {
  const settings = useSettings()
  const [expanded, setExpanded] = React.useState<string | false>(false)

  const folders: Record<string, any[]> = Object.entries(settings.config)
    .filter(([_, entry]) => (entry as Entry).type === 'folder')
    .reduce((a, [key]) => ({ ...a, [key]: [] }), {})

  for (const [key, entry] of Object.entries(settings.config)) {
    switch ((entry as Entry).type) {
      case 'folder':
        continue
      case 'button':
      case 'param': {
        const parts = key.split('.')
        const folder = parts.splice(0, parts.length - 1).join('.')
        folders[folder]!.push([key, entry])
      }
    }
  }

  return (
    <div id="settings">
      {Object.entries(folders).map(([folderKey, entries]) => (
        <Accordion
          disableGutters
          sx={{ width: expanded === false ? 100 : 300, margin: 0 }}
          key={folderKey}
          expanded={expanded === folderKey}
          onChange={(_, expanded) => {
            setExpanded(expanded ? folderKey : false)
          }}
          slotProps={{ transition: { timeout: 0 } }}
        >
          <AccordionSummary
            sx={{ minHeight: 30, maxHeight: 30 }}
            expandIcon={<ExpandMore />}
          >
            <Typography component={'span'} fontSize={12}>
              {settings.config[folderKey].title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'max-content auto',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              {entries.map(([paramKey, e]) => {
                const entry = e as Entry
                if (entry.type === 'button')
                  return (
                    <Button key={paramKey} onClick={() => entry.onClick()}>
                      {entry.title}
                    </Button>
                  )

                return (
                  <React.Fragment key={paramKey}>
                    <FormLabel sx={{ fontSize: 12 }}>{entry.label}</FormLabel>
                    {typeof entry.value === 'boolean' ? (
                      <Checkbox
                        sx={{
                          height: 10,
                          '&:hover': {
                            backgroundColor: 'transparent',
                          },
                          '&:click': {
                            backgroundColor: 'transparent',
                          },
                        }}
                        disableRipple={true}
                        checked={entry.value}
                        onChange={(e) =>
                          settings.set(paramKey, e.target.checked)
                        }
                      />
                    ) : (
                      <TextField
                        disabled={entry.opts?.readonly}
                        defaultValue={entry.value}
                        size="small"
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  )
}
