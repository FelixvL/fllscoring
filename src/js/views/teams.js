define('views/teams',[
    'services/log',
    'services/ng-teams',
    'services/ng-remotehost',
    'angular'
], function(log) {
    var moduleName = 'teams';

    return angular.module(moduleName, []).config(['$httpProvider', function($httpProvider) {
            delete $httpProvider.defaults.headers.common["X-Requested-With"];
        }]).controller(moduleName + 'Ctrl', [
        '$scope','$http','$q','$teams','$remotehost',
        function($scope,$http,$q,$teams,$remotehost) {

            log('init teams ctrl');
            $scope.log = log.get();
            $scope.teams = $teams.teams;
            $scope.newTeam = {};
            $scope.editMode = false;
            $scope.teamNumberPattern = /^\d+$/;
            $scope.status = "Initializing...";
            $scope.importMode = false;

            var initialized = null;

            $scope.init = function() {
                if (!initialized) {
                    initialized = $teams.init().then(function() {
                        if ($teams.teams.length === 0) {
                            $scope.status = 'No stored teams found, you may add them by hand';
                            $scope.editMode = true;
                        } else {
                            $scope.status = '';
                        }
                    });
                }
                return initialized;
            };
            $scope.init();

            //TODO: extract to service
            $scope.load = function() {
                return $remotehost.read('teams.json').then(function(res) {
                    $teams.clear();
                    res.forEach(function(team) {
                        $teams.add(team);
                    });
                    return $scope.saveTeams().then(function() {
                        log('successfully retrieved and saved teams');
                    });
                }).catch(function() {
                    log('failed retrieving teams');
                });
            };

            $scope.import = function() {
                $scope.importMode = true;
                $scope.importRaw = '';
            };

            $scope.finishImport = function() {
                $scope.importMode = false;
                $teams.clear();
                $scope.importLines.forEach(function(line) {
                    $teams.add({
                        number: line[$scope.importNumberColumn -1],
                        name: line[$scope.importNameColumn -1]
                    });
                });
            };

            $scope.$watch('importRaw',function(data) {
                parseData($scope.importRaw);
            });

            $scope.$watch('importHeader',function(data) {
                parseData($scope.importRaw);
            });

            function parseData(data) {
                //parse raw import, split lines
                var lines = data?data.split(/[\n\r]/):[];
                if ($scope.importHeader) {
                    lines.shift();
                }
                lines = lines.map(function(line) {
                    //split by tab character
                    return line.split(/\t/);
                });
                //try to guess names and number columns
                $scope.importNumberColumn = 1;
                $scope.importNameColumn = 2;

                if (lines[0]) {
                    $scope.importNumberExample = lines[0][$scope.importNumberColumn -1];
                    $scope.importNameExample = lines[0][$scope.importNameColumn -1];
                } else {
                    $scope.importNumberExample = '';
                    $scope.importNameExample = '';
                }

                $scope.importLines = lines;
            }



            $scope.selectTeam = function(team) {
                $scope.setPage('scoresheet');
                $scope.$root.$emit('selectTeam',team);
            };

            $scope.canAddTeam = function() {
                return !!($scope.newTeam.name && $scope.newTeam.number);
            };

            $scope.addTeam = function() {
                if (!$scope.canAddTeam()) {
                    return $q.reject(new Error("cannot add team"));
                }
                $teams.add($scope.newTeam);
                $scope.newTeam = {};
                return $scope.saveTeams();
            };

            $scope.removeTeam = function(number) {
                $teams.remove(number);
                return $scope.saveTeams();
            };

            $scope.saveTeams = function() {
                $scope.saving = true;
                // Teams used to be managed by the scope, but
                // that's now moved to a service.
                // However, most of the logic still assumes
                // being able to directly edit the team's properties.
                // To make transition to the service smooth and quick,
                // we simply copy the desired-teams-list, and (re-)add
                // these to the teams service.
                var newTeams = $scope.teams.slice();
                $teams.clear();
                newTeams.forEach(function(team) {
                    $teams.add(team);
                });
                return $teams.save().finally(function() {
                    $scope.saving = false;
                });
            };

            $scope.toggleExtended = function(isCollapsed) {
                if ($scope.editMode) {
                    return isCollapsed;
                } else {
                    return !isCollapsed;
                }
            };
        }
    ]);
});
