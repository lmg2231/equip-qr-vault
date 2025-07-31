import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Equipment {
  id: string;
  location: string;
  hp?: number;
  rpm?: number;
}

interface EquipmentFiltersProps {
  equipment: Equipment[];
  onFilterChange: (filtered: Equipment[]) => void;
}

export const EquipmentFilters = ({ equipment, onFilterChange }: EquipmentFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedHp, setSelectedHp] = useState<number[]>([]);
  const [selectedRpm, setSelectedRpm] = useState<number[]>([]);

  // Get unique values for filters
  const uniqueLocations = [...new Set(equipment.map(item => item.location))].sort();
  const uniqueHp = [...new Set(equipment.map(item => item.hp).filter(Boolean))].sort((a, b) => a! - b!);
  const uniqueRpm = [...new Set(equipment.map(item => item.rpm).filter(Boolean))].sort((a, b) => a! - b!);

  const applyFilters = () => {
    let filtered = equipment;

    if (selectedLocations.length > 0) {
      filtered = filtered.filter(item => selectedLocations.includes(item.location));
    }

    if (selectedHp.length > 0) {
      filtered = filtered.filter(item => item.hp && selectedHp.includes(item.hp));
    }

    if (selectedRpm.length > 0) {
      filtered = filtered.filter(item => item.rpm && selectedRpm.includes(item.rpm));
    }

    onFilterChange(filtered);
  };

  const clearFilters = () => {
    setSelectedLocations([]);
    setSelectedHp([]);
    setSelectedRpm([]);
    onFilterChange(equipment);
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations([...selectedLocations, location]);
    } else {
      setSelectedLocations(selectedLocations.filter(l => l !== location));
    }
  };

  const handleHpChange = (hp: number, checked: boolean) => {
    if (checked) {
      setSelectedHp([...selectedHp, hp]);
    } else {
      setSelectedHp(selectedHp.filter(h => h !== hp));
    }
  };

  const handleRpmChange = (rpm: number, checked: boolean) => {
    if (checked) {
      setSelectedRpm([...selectedRpm, rpm]);
    } else {
      setSelectedRpm(selectedRpm.filter(r => r !== rpm));
    }
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Location Filter */}
              <div>
                <h4 className="font-medium mb-3">Location</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uniqueLocations.map(location => (
                    <div key={location} className="flex items-center space-x-2">
                      <Checkbox
                        id={`location-${location}`}
                        checked={selectedLocations.includes(location)}
                        onCheckedChange={(checked) => handleLocationChange(location, !!checked)}
                      />
                      <label htmlFor={`location-${location}`} className="text-sm">
                        {location}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* HP Filter */}
              {uniqueHp.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">HP</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uniqueHp.map(hp => (
                      <div key={hp} className="flex items-center space-x-2">
                        <Checkbox
                          id={`hp-${hp}`}
                          checked={selectedHp.includes(hp!)}
                          onCheckedChange={(checked) => handleHpChange(hp!, !!checked)}
                        />
                        <label htmlFor={`hp-${hp}`} className="text-sm">
                          {hp} HP
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RPM Filter */}
              {uniqueRpm.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">RPM</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uniqueRpm.map(rpm => (
                      <div key={rpm} className="flex items-center space-x-2">
                        <Checkbox
                          id={`rpm-${rpm}`}
                          checked={selectedRpm.includes(rpm!)}
                          onCheckedChange={(checked) => handleRpmChange(rpm!, !!checked)}
                        />
                        <label htmlFor={`rpm-${rpm}`} className="text-sm">
                          {rpm} RPM
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters} size="sm">
                Apply Filters
              </Button>
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear All
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};